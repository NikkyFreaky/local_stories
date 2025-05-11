<?php
namespace local_stories\external;

defined('MOODLE_INTERNAL') || die();

// Логирование до require_once
function stories_log_debug($msg) {
    global $CFG;
    $logfile = (isset($CFG) && isset($CFG->dataroot)) ? $CFG->dataroot . '/temp/stories_debug.log' : __DIR__ . '/../../../../stories_debug.log';
    $ts = date('Y-m-d H:i:s');
    file_put_contents($logfile, "[$ts] $msg\n", FILE_APPEND);
}
stories_log_debug('start file');
try {
    stories_log_debug('isset($CFG): ' . (isset($CFG) ? 'yes' : 'no'));
    stories_log_debug('isset($CFG->libdir): ' . (isset($CFG) && isset($CFG->libdir) ? 'yes' : 'no'));
    stories_log_debug('$CFG->libdir: ' . (isset($CFG) && isset($CFG->libdir) ? $CFG->libdir : 'undefined'));
    stories_log_debug('before externallib');
    require_once($CFG->libdir . '/externallib.php');
    stories_log_debug('after externallib');
} catch (\Throwable $e) {
    stories_log_debug('externallib error: ' . $e->getMessage());
    throw $e;
}
try {
    stories_log_debug('before filelib');
    require_once($CFG->libdir . '/filelib.php');
    stories_log_debug('after filelib');
} catch (\Throwable $e) {
    stories_log_debug('filelib error: ' . $e->getMessage());
    throw $e;
}

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use context_system;
use moodle_url;

class upload_file extends external_api {
    /**
     * Описание параметров
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'filedata' => new external_value(PARAM_TEXT, 'Base64 encoded file data'),
            'filename' => new external_value(PARAM_FILE, 'Original filename'),
            'filetype' => new external_value(PARAM_TEXT, 'File mime type')
        ]);
    }

    private static function log_debug($msg) {
        global $CFG;
        $logfile = $CFG->dataroot . '/temp/stories_debug.log';
        $ts = date('Y-m-d H:i:s');
        file_put_contents($logfile, "[$ts] $msg\n", FILE_APPEND);
    }

    /**
     * Загружает файл
     */
    public static function execute($filedata, $filename, $filetype) {
        global $CFG;
        self::log_debug('execute called');
        try {
            self::log_debug('CFG->dataroot: ' . (isset($CFG->dataroot) ? $CFG->dataroot : 'not set'));
            self::log_debug('CFG->tempdir: ' . (isset($CFG->tempdir) ? $CFG->tempdir : 'not set'));
        } catch (\Exception $e) {
            self::log_debug('CFG error: ' . $e->getMessage());
        }
        try {
            $context = context_system::instance();
            self::log_debug('context_system ok');
        } catch (\Exception $e) {
            self::log_debug('context_system error: ' . $e->getMessage());
            throw $e;
        }
        try {
            require_capability('local/stories:create', $context);
            self::log_debug('capability ok');
        } catch (\Exception $e) {
            self::log_debug('capability error: ' . $e->getMessage());
            throw $e;
        }
        $params = self::validate_parameters(self::execute_parameters(), [
            'filedata' => $filedata,
            'filename' => $filename,
            'filetype' => $filetype
        ]);
        self::log_debug('params: ' . json_encode($params));
        // Проверяем тип файла
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
        if (!in_array($params['filetype'], $allowedTypes)) {
            self::log_debug('invalid filetype: ' . $params['filetype']);
            throw new \moodle_exception('error:invalidfiletype', 'local_stories');
        }
        // Декодируем данные файла
        $content = base64_decode($params['filedata']);
        if ($content === false) {
            self::log_debug('base64 decode failed');
            throw new \moodle_exception('error:invalidfiledata', 'local_stories');
        }
        self::log_debug('base64 decode ok, content length: ' . strlen($content));
        // Создаем временный файл
        $tempfile = tempnam($CFG->tempdir, 'stories_upload');
        if ($tempfile === false) {
            self::log_debug('tempfile create failed');
            throw new \moodle_exception('error:tempfile', 'local_stories');
        }
        if (file_put_contents($tempfile, $content) === false) {
            self::log_debug('file_put_contents failed');
            unlink($tempfile);
            throw new \moodle_exception('error:savefile', 'local_stories');
        }
        self::log_debug('file written: ' . $tempfile);
        try {
            $context = context_system::instance();
            $fs = get_file_storage();
            $fileinfo = [
                'contextid' => $context->id,
                'component' => 'local_stories',
                'filearea'  => 'content',
                'itemid'    => 0,
                'filepath'  => '/',
                'filename'  => $params['filename']
            ];
            self::log_debug('fileinfo: ' . json_encode($fileinfo));
            self::log_debug('before file_exists');
            $file_exists = $fs->file_exists(
                $fileinfo['contextid'],
                $fileinfo['component'],
                $fileinfo['filearea'],
                $fileinfo['itemid'],
                $fileinfo['filepath'],
                $fileinfo['filename']
            );
            self::log_debug('after file_exists: ' . ($file_exists ? 'yes' : 'no'));
            if ($file_exists) {
                $filename = pathinfo($params['filename'], PATHINFO_FILENAME);
                $extension = pathinfo($params['filename'], PATHINFO_EXTENSION);
                $fileinfo['filename'] = $filename . '_' . time() . '.' . $extension;
                self::log_debug('file exists, new filename: ' . $fileinfo['filename']);
            }
            self::log_debug('before create_file_from_pathname');
            try {
                $storedfile = $fs->create_file_from_pathname($fileinfo, $tempfile);
                self::log_debug('after create_file_from_pathname');
            } catch (\Throwable $e) {
                self::log_debug('create_file_from_pathname exception: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
                throw $e;
            }
            $url = moodle_url::make_pluginfile_url(
                $fileinfo['contextid'],
                $fileinfo['component'],
                $fileinfo['filearea'],
                $fileinfo['itemid'],
                $fileinfo['filepath'],
                $fileinfo['filename']
            )->out();
            self::log_debug('url: ' . $url);
            return [
                'url' => $url
            ];
        } catch (\Exception $e) {
            self::log_debug('exception: ' . $e->getMessage() . ' ' . $e->getTraceAsString());
            throw $e;
        } finally {
            unlink($tempfile);
            self::log_debug('tempfile deleted');
        }
    }

    /**
     * Описание возвращаемых данных
     */
    public static function execute_returns() {
        return new external_single_structure([
            'url' => new external_value(PARAM_URL, 'URL загруженного файла')
        ]);
    }
} 
