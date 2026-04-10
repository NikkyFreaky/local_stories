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

namespace local_stories;

use core\hook\output\before_footer_html_generation;
use core\context\system;

/**
 * Hook callbacks for local_stories.
 *
 * @package   local_stories
 * @copyright 2026, Zlobin Nikita
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Add stories modals before footer HTML generation.
     *
     * @param before_footer_html_generation $hook
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook): void {
        $context = system::instance();

        if (\has_capability('local/stories:view', $context)) {
            $hook->add_html($hook->renderer->render_from_template('local_stories/view_modal', []));
        }

        if (\has_capability('local/stories:create', $context)) {
            $hook->add_html($hook->renderer->render_from_template('local_stories/create_modal', []));
        }
    }
}
