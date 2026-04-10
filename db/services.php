<?php
declare(strict_types=1);

defined('MOODLE_INTERNAL') || die();

use local_stories\External\CreateStory;
use local_stories\External\GetStoriesList;
use local_stories\External\GetStory;
use local_stories\External\PublishStory;
use local_stories\External\UploadFile;
use local_stories\Support\Lang;

$functions = [
    /** @see \local_stories\External\CreateStory::execute() */
    'local_stories_create_story' => [
        'classname' => CreateStory::class,
        'methodname' => 'execute',
        'description' => Lang::get('wsf:create_story'),
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:create',
    ],
    /** @see \local_stories\External\PublishStory::execute() */
    'local_stories_publish_story' => [
        'classname' => PublishStory::class,
        'methodname' => 'execute',
        'description' => Lang::get('wsf:publish_story'),
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:publish',
    ],
    /** @see \local_stories\External\UploadFile::execute() */
    'local_stories_upload_file' => [
        'classname' => UploadFile::class,
        'methodname' => 'execute',
        'description' => Lang::get('wsf:upload_file'),
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:create',
    ],
    /** @see \local_stories\External\GetStory::execute() */
    'local_stories_get_story' => [
        'classname' => GetStory::class,
        'methodname' => 'execute',
        'description' => Lang::get('wsf:get_story'),
        'type' => 'read',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:view',
    ],
    /** @see \local_stories\External\GetStoriesList::execute() */
    'local_stories_get_stories_list' => [
        'classname' => GetStoriesList::class,
        'methodname' => 'execute',
        'description' => Lang::get('wsf:get_stories_list'),
        'type' => 'read',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:view',
    ],
];

$services = [
    'Stories service' => [
        'functions' => [
            'local_stories_create_story',
            'local_stories_publish_story',
            'local_stories_upload_file',
            'local_stories_get_story',
            'local_stories_get_stories_list',
        ],
        'restrictedusers' => 0,
        'enabled' => 1,
    ],
];
