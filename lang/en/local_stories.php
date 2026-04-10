<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Version metadata for the local_stories plugin.
 *
 * @package   local_stories
 * @category  lang
 * @copyright 2025, Zlobin Nikita
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

include __DIR__ . '/../ru/local_stories.php';

$string['pluginname'] = 'Stories';

// Capabilities
$string['stories:create'] = 'Create stories';
$string['stories:edit_own'] = 'Edit own stories';
$string['stories:edit_any'] = 'Edit any stories';
$string['stories:delete_own'] = 'Delete own stories';
$string['stories:delete_any'] = 'Delete any stories';
$string['stories:publish'] = 'Publish stories';
$string['stories:view'] = 'View stories';

// Errors
$string['erroremptytitle'] = 'Story title cannot be empty';
$string['errornotfound'] = 'Story not found';
$string['errornopermission'] = 'You do not have permission to perform this action';
$string['erroralreadypublished'] = 'Story is already published';
$string['erroralreadyunpublished'] = 'Story is already unpublished';
$string['errorinvalidstatus'] = 'Invalid story status';
$string['error:invalidfiletype'] = 'Invalid file type';
$string['error:invalidfiledata'] = 'Invalid file data';
$string['error:tempfile'] = 'Failed to create temporary file';
$string['error:savefile'] = 'Failed to save file';

// Status
$string['status_draft'] = 'Draft';
$string['status_published'] = 'Published';
