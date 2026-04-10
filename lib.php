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
 *
 * @package   local_stories
 * @copyright 2026, Zlobin Nikita
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

declare(strict_types=1);

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/local/stories/classes/Stories.php');

/**
 * @param \core_renderer $renderer The page renderer.
 * @return string HTML for stories buttons.
 */
function local_stories_render_navbar_output(\core_renderer $renderer): string {
    return '';
}

/**
 * Serves the files from the local_stories file areas
 *
 * @param stdClass $course the course object
 * @param stdClass $cm the course module object
 * @param stdClass $context the context
 * @param string $filearea the name of the file area
 * @param array $args extra arguments (itemid, path)
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @return bool false if the file not found, just send the file otherwise
 */
function local_stories_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    // Check the contextlevel is as expected
    if ($context->contextlevel !== CONTEXT_SYSTEM) {
        return false;
    }

    // Make sure the filearea is one of those used by the plugin
    if ($filearea !== 'content') {
        return false;
    }

    // Make sure the user is logged in and has access to the module
    require_login($course, true, $cm);

    // Extract the filename / filepath from the $args array
    $itemid = array_shift($args); // The first item in the $args array
    $filename = array_pop($args); // The last item in the $args array
    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }

    // Retrieve the file from the Files API
    $fs = get_file_storage();
    $file = $fs->get_file($context->id, 'local_stories', $filearea, $itemid, $filepath, $filename);
    if (!$file) {
        return false; // The file does not exist
    }

    // Send the file back
    send_stored_file($file, 86400, 0, $forcedownload, $options);
}
