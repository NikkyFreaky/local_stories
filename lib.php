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
 * @copyright 2025, Zlobin Nikita
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * @param \core_renderer $renderer The page renderer.
 * @return string HTML for stories buttons.
 */
function local_stories_render_navbar_output(\core_renderer $renderer) {
    global $PAGE;
    // Подключаем JS для управления модальным окном
    $PAGE->requires->js_call_amd('local_stories/modal', 'init');
    $PAGE->requires->js_call_amd('local_stories/stories', 'init');
    // Только navbar, без модалки!
    return $renderer->render_from_template('local_stories/navbar', []);
}

function local_stories_before_footer() {
    global $OUTPUT;
    // Только вывод модалки, без подключения CSS!
    echo $OUTPUT->render_from_template('local_stories/create_modal', []);
} 
