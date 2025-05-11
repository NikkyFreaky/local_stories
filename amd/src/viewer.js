/* eslint-disable linebreak-style */
define(['jquery', 'core/ajax', 'core/notification'], function (
  $,
  Ajax,
  Notification
) {
  'use strict';

  /**
   * Загружает историю по id через AJAX.
   * @param {number} storyId
   * @returns {Promise<Object>}
   */
  function loadStoryById(storyId) {
    return Ajax.call([
      {
        methodname: 'local_stories_get_story',
        args: {id: storyId},
      },
    ])[0];
  }

  /**
   * Загружает список опубликованных историй через AJAX.
   * @returns {Promise<Array>}
   */
  function loadStoriesList() {
    return Ajax.call([
      {
        methodname: 'local_stories_get_stories_list',
        args: {},
      },
    ])[0];
  }

  class StoriesViewer {
    constructor() {
      if (typeof $ === 'undefined') {
        throw new Error('jQuery is required for StoriesViewer');
      }
      this.$modal = $('#stories-view-modal');
      this.$progressItems = this.$modal.find(
        '.stories-view-modal__progress-items'
      );
      this.$image = this.$modal.find('.stories-view-modal__image');
      this.$video = this.$modal.find('.stories-view-modal__video');
      this.$texts = this.$modal.find('.stories-view-modal__texts');
      this.$viewer = this.$modal.find('.stories-view-modal__viewer');

      this.story = null;
      this.currentSlideIndex = 0;
      this.timer = null;
      this.isPaused = false;

      this.bindEvents();
    }

    bindEvents() {
      // Навигация
      this.$modal
        .find('[data-action="prev-slide"]')
        .on('click', () => this.prevSlide());
      this.$modal
        .find('[data-action="next-slide"]')
        .on('click', () => this.nextSlide());

      // Закрытие
      this.$modal
        .find('[data-action="close-modal"]')
        .on('click', () => this.hide());

      // Клавиатура
      $(document).on('keydown.stories-viewer', (e) => {
        if (!this.$modal.hasClass('show')) {
          return;
        }

        switch (e.key) {
          case 'ArrowLeft':
            this.prevSlide();
            break;
          case 'ArrowRight':
            this.nextSlide();
            break;
          case ' ':
            this.togglePause();
            e.preventDefault();
            break;
          case 'Escape':
            this.hide();
            break;
        }
      });

      // Клик по сторонам для навигации ИЛИ по контенту для паузы
      this.$modal.on('click', (e) => {
        const $target = $(e.target);

        // 1. Игнорируем клики по специальным кнопкам управления (они имеют свои обработчики)
        if (
          $target.closest(
            '[data-action="prev-slide"], [data-action="next-slide"], [data-action="close-modal"]'
          ).length
        ) {
          return;
        }

        // 2. Если клик внутри области просмотра слайда (.stories-view-modal__viewer)
        if ($target.closest('.stories-view-modal__viewer').length) {
          this.togglePause();
          return; // Клик обработан как пауза/воспроизведение
        }

        // 3. Если клик не по контролам и не по контенту, то это навигация по краям модального окна
        const modalRect = this.$modal[0].getBoundingClientRect();
        const relativeClickX = e.clientX - modalRect.left;

        if (relativeClickX < modalRect.width * 0.3) {
          this.prevSlide();
        } else if (relativeClickX > modalRect.width * 0.7) {
          this.nextSlide();
        }
      });
    }

    show(storyOrId) {
      if (typeof storyOrId === 'object') {
        this._showStory(storyOrId);
      } else if (
        typeof storyOrId === 'number' ||
        (typeof storyOrId === 'string' && storyOrId.match(/^\d+$/))
      ) {
        // Загрузка истории по id
        this.$modal.addClass('show');
        $('body').addClass('modal-open');
        this.$modal.find('.stories-view-modal__body').addClass('loading');
        loadStoryById(Number(storyOrId))
          .then((story) => {
            this.$modal
              .find('.stories-view-modal__body')
              .removeClass('loading');
            this._showStory(story);
          })
          .catch((e) => {
            this.$modal
              .find('.stories-view-modal__body')
              .removeClass('loading');
            Notification.exception(e);
            this.hide();
          });
      } else {
        Notification.add('Некорректный идентификатор истории', 'error');
        this.hide();
      }
    }

    _showStory(story) {
      this.story = story;
      this.currentSlideIndex = 0;
      this.isPaused = false;
      // Создаем индикаторы прогресса
      this.$progressItems.empty();
      story.slides.forEach(() => {
        this.$progressItems.append(
          '<div class="stories-view-modal__progress-item"></div>'
        );
      });
      // Показываем модальное окно
      this.$modal.addClass('show');
      $('body').addClass('modal-open');
      // Загружаем первый слайд
      this.loadSlide(0);
    }

    hide() {
      this.$modal.removeClass('show');
      $('body').removeClass('modal-open');
      this.stopTimer();
      this.$viewer.css('background-color', '');

      // Очищаем состояние
      this.story = null;
      this.currentSlideIndex = 0;
      this.$progressItems.empty();
      this.$image.hide().attr('src', '');
      this.$video.hide().attr('src', '');
      this.$texts.empty();
    }

    loadSlide(index) {
      const slide = this.story.slides[index];
      if (!slide) {
        return;
      }
      this.currentSlideIndex = index;

      // Останавливаем предыдущий таймер
      this.stopTimer();
      this.$viewer.css('background-color', '');

      // Обновляем прогресс
      this.$progressItems.children().removeClass('active viewed');
      this.$progressItems.children().slice(0, index).addClass('viewed');
      this.$progressItems.children().eq(index).addClass('active');

      // Очищаем предыдущий контент
      this.$image.hide().attr('src', '');
      this.$video.hide().attr('src', '');
      this.$texts.empty();

      // Если нет картинки/видео, явно применяем фон к .stories-view-modal__media-container
      if (!slide.mediaType && slide.background) {
        this.$viewer
          .find('.stories-view-modal__media-container')
          .css('background', slide.background);
      } else {
        this.$viewer
          .find('.stories-view-modal__media-container')
          .css('background', '');
      }

      // Загружаем медиа
      if (slide.mediaType === 'image') {
        if (slide.mediaUrl) {
          this.$image.attr('src', slide.mediaUrl).show();
        } else {
          this.$image.hide().attr('src', '');
        }
      } else if (slide.mediaType === 'video') {
        if (slide.mediaUrl) {
          this.$video.attr('src', slide.mediaUrl).show();
          if (!this.isPaused) {
            this.$video[0].play();
          }
        } else {
          this.$video.hide().attr('src', '');
        }
      }

      // Устанавливаем фон слайда, если он есть
      if (slide.background) {
        this.$viewer.css('background-color', slide.background);
      }

      // Добавляем тексты
      slide.texts.forEach((text) => {
        $('<div>')
          .addClass('stories-view-modal__text')
          .css({
            left: text.x + 'px',
            top: text.y + 'px',
            color: text.color,
            fontSize: text.size + 'px',
            textAlign: text.align,
          })
          .text(text.text)
          .appendTo(this.$texts);
      });

      // Запускаем таймер для следующего слайда
      if (!this.isPaused) {
        this.startTimer(slide.duration);
      }
    }

    startTimer(duration) {
      this.stopTimer();

      const startTime = Date.now();
      const $progress = this.$progressItems
        .children()
        .eq(this.currentSlideIndex);

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        $progress.css('--progress', progress + '%');

        if (progress < 100) {
          this.timer = requestAnimationFrame(updateProgress);
        } else {
          this.nextSlide();
        }
      };

      this.timer = requestAnimationFrame(updateProgress);
    }

    stopTimer() {
      if (this.timer) {
        cancelAnimationFrame(this.timer);
        this.timer = null;
      }
    }

    prevSlide() {
      if (this.currentSlideIndex > 0) {
        this.loadSlide(this.currentSlideIndex - 1);
      }
    }

    nextSlide() {
      if (this.story && this.currentSlideIndex < this.story.slides.length - 1) {
        this.loadSlide(this.currentSlideIndex + 1);
      } else {
        this.hide(); // Закрываем, если это был последний слайд
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.stopTimer();
        if (
          this.story &&
          this.story.slides[this.currentSlideIndex].mediaType === 'video'
        ) {
          this.$video[0].pause();
        }
        // Удалены строки, связанные с this.$pauseBtn и обновлением его иконок
      } else {
        if (this.story && this.story.slides[this.currentSlideIndex]) {
          // Если мы возобновляем, нужно корректно запустить таймер
          // Возможно, потребуется передать оставшееся время, но для простоты пока полный duration
          this.startTimer(this.story.slides[this.currentSlideIndex].duration);
          if (this.story.slides[this.currentSlideIndex].mediaType === 'video') {
            this.$video[0].play();
          }
        }
      }
      // Здесь раньше могло быть обновление иконок this.$pauseBtn
    }
  }

  return {
    init: function () {
      if (typeof $ === 'undefined') {
        throw new Error('jQuery is required for StoriesViewer');
      }

      const viewer = new StoriesViewer();

      // Добавляем глобальный метод для открытия просмотрщика
      window.StoriesViewer = {
        show: (storyOrId) => viewer.show(storyOrId),
      };

      // Лента историй в navbar
      const $nav = $('.stories-nav');
      loadStoriesList().then(function (stories) {
        $nav.find('.stories-btn:not(.stories-create)').remove();
        if (!stories || !stories.length) {
          return;
        }
        const $createBtn = $nav.find('.stories-create');
        stories.forEach(function (story) {
          const $item = $('<div>')
            .addClass('stories-btn')
            .attr('title', story.title)
            .css({display: 'inline-block', cursor: 'pointer', margin: '0 4px'})
            .append(
              story.preview
                ? $('<img>').attr('src', story.preview).css({
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #ccc',
                  })
                : $('<div>')
                    .css({
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#eee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#888',
                    })
                    .text(story.title[0] || '?')
            )
            .on('click', function () {
              viewer.show(story.id);
            });
          $createBtn.after($item);
        });
      });
    },
  };
});
