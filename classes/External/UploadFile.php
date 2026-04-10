<?php
declare(strict_types=1);

namespace local_stories\External;

global $CFG;
require_once($CFG->libdir . '/externallib.php');
require_once($CFG->libdir . '/filelib.php');

use context_system;
use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;
use moodle_url;

class UploadFile extends external_api {
    /**
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'filedata' => new external_value(PARAM_TEXT, 'Base64 encoded file data'),
            'filename' => new external_value(PARAM_FILE, 'Original filename'),
            'filetype' => new external_value(PARAM_TEXT, 'File mime type'),
        ]);
    }

    /**
     * @param string $filedata
     * @param string $filename
     * @param string $filetype
     * @return array
     */
    public static function execute($filedata, $filename, $filetype): array {
        global $CFG;

        $context = context_system::instance();
        \require_capability('local/stories:create', $context);

        $params = self::validate_parameters(self::execute_parameters(), [
            'filedata' => $filedata,
            'filename' => $filename,
            'filetype' => $filetype,
        ]);

        $allowedtypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
        if (!in_array($params['filetype'], $allowedtypes, true)) {
            throw new \moodle_exception('error:invalidfiletype', 'local_stories');
        }

        $content = base64_decode($params['filedata'], true);
        if ($content === false) {
            throw new \moodle_exception('error:invalidfiledata', 'local_stories');
        }

        $tempfile = tempnam($CFG->tempdir, 'stories_upload');
        if ($tempfile === false) {
            throw new \moodle_exception('error:tempfile', 'local_stories');
        }

        if (file_put_contents($tempfile, $content) === false) {
            @unlink($tempfile);
            throw new \moodle_exception('error:savefile', 'local_stories');
        }

        try {
            $fs = \get_file_storage();
            $fileinfo = [
                'contextid' => $context->id,
                'component' => 'local_stories',
                'filearea' => 'content',
                'itemid' => 0,
                'filepath' => '/',
                'filename' => $params['filename'],
            ];

            if ($fs->file_exists(
                $fileinfo['contextid'],
                $fileinfo['component'],
                $fileinfo['filearea'],
                $fileinfo['itemid'],
                $fileinfo['filepath'],
                $fileinfo['filename']
            )) {
                $name = pathinfo($params['filename'], PATHINFO_FILENAME);
                $extension = pathinfo($params['filename'], PATHINFO_EXTENSION);
                $suffix = $extension !== '' ? '.' . $extension : '';
                $fileinfo['filename'] = $name . '_' . time() . $suffix;
            }

            $fs->create_file_from_pathname($fileinfo, $tempfile);

            return [
                'url' => moodle_url::make_pluginfile_url(
                    $fileinfo['contextid'],
                    $fileinfo['component'],
                    $fileinfo['filearea'],
                    $fileinfo['itemid'],
                    $fileinfo['filepath'],
                    $fileinfo['filename']
                )->out(),
            ];
        } finally {
            @unlink($tempfile);
        }
    }

    /**
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'url' => new external_value(PARAM_URL, 'URL загруженного файла'),
        ]);
    }
}
