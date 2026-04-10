<?php
namespace local_stories\external;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;

class publish_story extends external_api {
    /**
     * Описание параметров
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'story_id' => new external_value(PARAM_INT, 'Story ID'),
            'publish' => new external_value(PARAM_BOOL, 'True to publish, false to unpublish', VALUE_DEFAULT, true)
        ]);
    }

    /**
     * Публикует или снимает с публикации историю
     */
    public static function execute($story_id, $publish = true) {
        $params = self::validate_parameters(self::execute_parameters(), [
            'story_id' => $story_id,
            'publish' => $publish
        ]);

        if ($params['publish']) {
            $result = \local_stories\stories::publish($params['story_id']);
            $status = \local_stories\stories::STATUS_PUBLISHED;
        } else {
            $result = \local_stories\stories::unpublish($params['story_id']);
            $status = \local_stories\stories::STATUS_DRAFT;
        }

        return [
            'success' => $result,
            'status' => $status
        ];
    }

    /**
     * Описание возвращаемых данных
     */
    public static function execute_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Operation success status'),
            'status' => new external_value(PARAM_INT, 'New story status')
        ]);
    }
} 
