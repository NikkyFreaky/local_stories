<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_stories_create_story' => [
        'classname' => 'local_stories\external\create_story',
        'methodname' => 'execute',
        'description' => 'Creates a new story',
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:create'
    ],
    'local_stories_publish_story' => [
        'classname' => 'local_stories\external\publish_story',
        'methodname' => 'execute',
        'description' => 'Publishes a story',
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:publish'
    ],
    'local_stories_upload_file' => [
        'classname' => 'local_stories\external\upload_file',
        'methodname' => 'execute',
        'description' => 'Uploads a file for story',
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
        'capabilities' => 'local/stories:create'
    ]
];

$services = [
    'Stories service' => [
        'functions' => [
            'local_stories_create_story',
            'local_stories_publish_story',
            'local_stories_upload_file'
        ],
        'restrictedusers' => 0,
        'enabled' => 1
    ]
]; 
