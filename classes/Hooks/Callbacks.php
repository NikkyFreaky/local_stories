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

declare(strict_types=1);

namespace local_stories\Hooks;

use core\hook\output\before_standard_top_of_body_html_generation;
use core\hook\output\before_footer_html_generation;
use core\context\system;
use local_stories\Stories;

/**
 * Hook callbacks for local_stories.
 *
 * @package   local_stories
 * @copyright 2026, Zlobin Nikita
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class Callbacks {
    /**
     * Add stories navbar to top of body.
     *
     * @param before_standard_top_of_body_html_generation $hook
     */
    public static function beforeStandardTopOfBodyHtmlGeneration(before_standard_top_of_body_html_generation $hook): void {
        global $DB, $PAGE, $USER;

        if (!\isloggedin() || \isguestuser()) {
            return;
        }

        $context = system::instance();
        $cancreate = \has_capability('local/stories:create', $context);

        $stories = Stories::get_list([
            'status' => Stories::STATUS_PUBLISHED,
            'active' => true,
        ]);

        foreach ($stories as &$story) {
            $story->seen = $DB->record_exists('local_stories_views', [
                'story_id' => $story->id,
                'user_id' => $USER->id,
            ]);
        }
        unset($story);

        $PAGE->requires->js_call_amd('local_stories/viewer', 'init');
        $PAGE->requires->js_call_amd('local_stories/modal', 'init');

        if ($cancreate) {
            $PAGE->requires->js_call_amd('local_stories/stories', 'init');
        }

        $hook->add_html($hook->renderer->render_from_template('local_stories/navbar', [
            'cancreate' => $cancreate,
            'stories' => array_values($stories),
        ]));
    }

    /**
     * Add stories modals before footer HTML generation.
     *
     * @param before_footer_html_generation $hook
     */
    public static function beforeFooterHtmlGeneration(before_footer_html_generation $hook): void {
        if (!\isloggedin() || \isguestuser()) {
            return;
        }

        $context = system::instance();

        $hook->add_html($hook->renderer->render_from_template('local_stories/view_modal', []));

        if (\has_capability('local/stories:create', $context)) {
            $hook->add_html($hook->renderer->render_from_template('local_stories/create_modal', []));
        }
    }
}
