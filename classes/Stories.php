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

namespace local_stories;

/**
 * API для работы с историями.
 *
 * @package    local_stories
 * @copyright  2025 Nikita Zlobin
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class Stories {
    /** @var int Статус черновика */
    public const STATUS_DRAFT = 0;

    /** @var int Статус опубликованной истории */
    public const STATUS_PUBLISHED = 1;

    /**
     * Создает новую историю.
     *
     * @param \stdClass $data Данные истории
     * @return int ID созданной истории
     */
    public static function create(\stdClass $data): int {
        global $DB, $USER;

        if (!\has_capability('local/stories:create', \context_system::instance())) {
            throw new \moodle_exception('nopermissions', 'error', '', 'create story');
        }

        if (empty($data->title)) {
            throw new \moodle_exception('erroremptytitle', 'local_stories');
        }

        $story = new \stdClass();
        $story->user_id = $USER->id;
        $story->course_id = $data->course_id ?? null;
        $story->title = $data->title;
        $story->created_at = time();
        $story->expires_at = $data->expires_at ?? null;
        $story->status = self::STATUS_DRAFT;
        $story->deleted = 0;
        $story->timecreated = time();
        $story->timemodified = $story->timecreated;

        return $DB->insert_record('local_stories', $story);
    }

    /**
     * Публикует историю.
     *
     * @param int $storyid ID истории
     * @return bool
     */
    public static function publish(int $storyid): bool {
        global $DB, $USER;

        if (!\has_capability('local/stories:publish', \context_system::instance())) {
            throw new \moodle_exception('nopermissions', 'error', '', 'publish story');
        }

        $story = $DB->get_record('local_stories', ['id' => $storyid, 'deleted' => 0], '*', MUST_EXIST);
        if ($story->user_id != $USER->id && !\has_capability('local/stories:edit_any', \context_system::instance())) {
            throw new \moodle_exception('nopermissions', 'error', '', 'publish story');
        }

        $story->status = self::STATUS_PUBLISHED;
        $story->timemodified = time();

        return $DB->update_record('local_stories', $story);
    }

    /**
     * Снимает историю с публикации.
     *
     * @param int $storyid ID истории
     * @return bool
     */
    public static function unpublish(int $storyid): bool {
        global $DB, $USER;

        if (!\has_capability('local/stories:publish', \context_system::instance())) {
            throw new \moodle_exception('nopermissions', 'error', '', 'unpublish story');
        }

        $story = $DB->get_record('local_stories', ['id' => $storyid, 'deleted' => 0], '*', MUST_EXIST);
        if ($story->user_id != $USER->id && !\has_capability('local/stories:edit_any', \context_system::instance())) {
            throw new \moodle_exception('nopermissions', 'error', '', 'unpublish story');
        }

        $story->status = self::STATUS_DRAFT;
        $story->timemodified = time();

        return $DB->update_record('local_stories', $story);
    }

    /**
     * Получает список историй с фильтрацией.
     *
     * @param array $filters
     * @return array
     */
    public static function get_list(array $filters = []): array {
        global $DB;

        $conditions = ['deleted = 0'];
        $params = [];

        if (isset($filters['status'])) {
            $conditions[] = 'status = :status';
            $params['status'] = $filters['status'];
        }

        if (isset($filters['course_id'])) {
            $conditions[] = 'course_id = :course_id';
            $params['course_id'] = $filters['course_id'];
        }

        if (isset($filters['user_id'])) {
            $conditions[] = 'user_id = :user_id';
            $params['user_id'] = $filters['user_id'];
        }

        if (isset($filters['active'])) {
            $now = time();
            if ($filters['active']) {
                $conditions[] = '(expires_at IS NULL OR expires_at > :now)';
            } else {
                $conditions[] = 'expires_at <= :now';
            }
            $params['now'] = $now;
        }

        $sql = 'SELECT * FROM {local_stories} WHERE ' . implode(' AND ', $conditions);
        $sql .= ' ORDER BY created_at DESC';

        return $DB->get_records_sql($sql, $params);
    }
}
