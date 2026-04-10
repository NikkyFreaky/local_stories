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

declare(strict_types=1);

$string['pluginname'] = 'Истории';
$string['privacy:metadata'] = 'Плагин "' . $string['pluginname'] . '" не хранит персональные данные.';

$string['stories:create'] = 'Создание историй';
$string['stories:edit_own'] = 'Редактирование своих историй';
$string['stories:edit_any'] = 'Редактирование любых историй';
$string['stories:delete_own'] = 'Удаление своих историй';
$string['stories:delete_any'] = 'Удаление любых историй';
$string['stories:publish'] = 'Публикация историй';
$string['stories:view'] = 'Просмотр историй';

$string['erroremptytitle'] = 'Заголовок истории не может быть пустым';
$string['errornotfound'] = 'История не найдена';
$string['errornopermission'] = 'Недостаточно прав для выполнения действия';
$string['erroralreadypublished'] = 'История уже опубликована';
$string['erroralreadyunpublished'] = 'Публикация истории уже снята';
$string['errorinvalidstatus'] = 'Некорректный статус истории';
$string['error:invalidfiletype'] = 'Недопустимый тип файла';
$string['error:invalidfiledata'] = 'Некорректные данные файла';
$string['error:tempfile'] = 'Не удалось создать временный файл';
$string['error:savefile'] = 'Не удалось сохранить файл';

$string['status_draft'] = 'Черновик';
$string['status_published'] = 'Опубликовано';

$string['modal:create_title'] = 'Создание истории';
$string['modal:view_title'] = 'Просмотр истории';
$string['modal:dropzone_text'] = 'Перетащите сюда фото или видео';
$string['modal:preview_alt'] = 'Предпросмотр';
$string['modal:text_disabled_title'] = 'Добавьте хотя бы один слайд, чтобы добавить текст';
$string['modal:text'] = 'Текст';
$string['modal:background'] = 'Фон';
$string['modal:color'] = 'Цвет';
$string['modal:add_text'] = '+ Добавить текст';
$string['modal:font_size'] = 'Размер:';
$string['modal:font_family'] = 'Шрифт:';
$string['modal:style_bold'] = 'Жирный';
$string['modal:style_italic'] = 'Курсив';
$string['modal:style_underline'] = 'Подчеркнутый';
$string['modal:align_left'] = 'Выровнять влево';
$string['modal:align_center'] = 'Выровнять по центру';
$string['modal:align_right'] = 'Выровнять вправо';
$string['modal:add_slide'] = 'Добавить слайд';
$string['modal:publish'] = 'Опубликовать';
$string['modal:publish_disabled_title'] = 'Добавьте хотя бы один слайд, чтобы опубликовать историю';
$string['modal:previous_story'] = 'Предыдущая история';
$string['modal:next_story'] = 'Следующая история';
$string['modal:story_aria'] = 'История';
$string['modal:back'] = 'Назад';
$string['modal:yes'] = 'Да';
$string['modal:no'] = 'Нет';

$string['wsf:create_story'] = 'Создать новую историю';
$string['wsf:publish_story'] = 'Опубликовать историю';
$string['wsf:upload_file'] = 'Загрузить файл для истории';
$string['wsf:get_story'] = 'Получить опубликованную историю по ID';
$string['wsf:get_stories_list'] = 'Получить список опубликованных историй';
