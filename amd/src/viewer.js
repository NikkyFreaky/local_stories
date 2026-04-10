/* eslint-disable linebreak-style */
import $ from 'jquery';
import Ajax from 'core/ajax';
import Notification from 'core/notification';

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
      this.storiesList = [];
      this.currentStoryIndex = 0;

      this.bindEvents();
    }

    bindEvents() {
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

      // Кнопки навигации между историями
      this.$modal
        .find('[data-action="prev-story"]')
        .on('click', () => this.prevStory());
      this.$modal
        .find('[data-action="next-story"]')
        .on('click', () => this.nextStory());
      // Кнопка закрытия
      this.$modal
        .find('[data-action="close-modal"]')
        .on('click', () => this.hide());

      // Новый UX: удержание ЛКМ — пауза, клик — навигация по слайдам
      let pauseTimeout = null;
      let isHolding = false;
      const viewer = this.$viewer;
      viewer.on('mousedown', (e) => {
        if (e.button !== 0) {
          return;
        } // Только ЛКМ
        isHolding = false;
        pauseTimeout = setTimeout(() => {
          isHolding = true;
          if (!this.isPaused) {
            this.togglePause();
          }
        }, 150);
      });
      viewer.on('mouseup mouseleave', () => {
        clearTimeout(pauseTimeout);
        if (isHolding && this.isPaused) {
          this.togglePause();
        }
        isHolding = false;
      });
      viewer.on('click', (e) => {
        // Если был холд — не навигируем
        if (isHolding) {
          return;
        }
        const rect = viewer[0].getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      });
    }

    show(storyOrId, storiesList = null, storyIndex = null) {
      if (storiesList) {
        this.storiesList = storiesList;
        this.currentStoryIndex = storyIndex !== null ? storyIndex : 0;
      }
      if (typeof storyOrId === 'object') {
        this._showStory(storyOrId);
      } else if (
        typeof storyOrId === 'number' ||
        (typeof storyOrId === 'string' && storyOrId.match(/^\d+$/))
      ) {
        if (window.StoriesViewModal && typeof window.StoriesViewModal.show === 'function') {
          window.StoriesViewModal.show();
        } else {
          this.$modal.addClass('show').css('display', 'block');
          $('body').addClass('modal-open');
          if ($('.modal-backdrop').length === 0) {
            $('<div class="modal-backdrop fade show"></div>').appendTo(
              document.body
            );
          }
        }
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
      if (window.StoriesViewModal && typeof window.StoriesViewModal.show === 'function') {
        window.StoriesViewModal.show();
      } else {
        this.$modal.addClass('show').css('display', 'block');
        $('body').addClass('modal-open');
        if ($('.modal-backdrop').length === 0) {
          $('<div class="modal-backdrop fade show"></div>').appendTo(
            document.body
          );
        }
      }
      // Загружаем первый слайд
      this.loadSlide(0);
      // Обновляем состояние стрелок историй
      this.updateStoryNavButtons();
      // --- Предпросмотр соседних историй ---
      const $prevPreview = this.$modal.find(
        '.stories-view-modal__preview--prev'
      );
      const $nextPreview = this.$modal.find(
        '.stories-view-modal__preview--next'
      );
      $prevPreview.empty().hide();
      $nextPreview.empty().hide();
      if (this.storiesList && this.storiesList.length > 1) {
        // prev: более старая (индекс +1)
        if (this.currentStoryIndex < this.storiesList.length - 1) {
          const prevStory = this.storiesList[this.currentStoryIndex + 1];
          if (prevStory && prevStory.preview) {
            $prevPreview
              .html('<img src="' + prevStory.preview + '" alt="">')
              .show();
          } else {
            $prevPreview.html('').css('background', '#222').show();
          }
        }
        // next: более новая (индекс -1)
        if (this.currentStoryIndex > 0) {
          const nextStory = this.storiesList[this.currentStoryIndex - 1];
          if (nextStory && nextStory.preview) {
            $nextPreview
              .html('<img src="' + nextStory.preview + '" alt="">')
              .show();
          } else {
            $nextPreview.html('').css('background', '#222').show();
          }
        }
      }
    }

    hide() {
      if (window.StoriesViewModal && typeof window.StoriesViewModal.hide === 'function') {
        window.StoriesViewModal.hide();
      } else {
        this.$modal.removeClass('show').css('display', '');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      }
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
        this.nextStory();
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

    nextStory() {
      if (this.storiesList && this.currentStoryIndex > 0) {
        this.currentStoryIndex--;
        const nextStory = this.storiesList[this.currentStoryIndex];
        this.show(nextStory.id, this.storiesList, this.currentStoryIndex);
      } else {
        this.hide();
      }
    }

    prevStory() {
      if (
        this.storiesList &&
        this.currentStoryIndex < this.storiesList.length - 1
      ) {
        this.currentStoryIndex++;
        const prevStory = this.storiesList[this.currentStoryIndex];
        this.show(prevStory.id, this.storiesList, this.currentStoryIndex);
      }
    }

    updateStoryNavButtons() {
      // next-story дизейблится на самой новой (индекс 0)
      // prev-story дизейблится на самой старой (индекс length-1)
      const $prev = this.$modal.find('.stories-view-modal__nav-story--prev');
      const $next = this.$modal.find('.stories-view-modal__nav-story--next');
      if (this.currentStoryIndex === this.storiesList.length - 1) {
        $prev.prop('disabled', true);
      } else {
        $prev.prop('disabled', false);
      }
      if (!this.storiesList || this.currentStoryIndex === 0) {
        $next.prop('disabled', true);
      } else {
        $next.prop('disabled', false);
      }
    }
  }

export const init = () => {
      if (typeof $ === 'undefined') {
        throw new Error('jQuery is required for StoriesViewer');
      }

      const viewer = new StoriesViewer();
      window.StoriesViewerInstance = viewer;

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
        stories.forEach(function (story, idx) {
          const $item = $('<button type="button">')
            .addClass('stories-btn')
            .attr('title', story.title)
            .on('click', function () {
              viewer.show(story.id, stories, idx);
            });
          if (story.preview) {
            $item.append(
              $('<img>').attr('src', story.preview).addClass('stories-btn-img')
            );
          } else {
            $item.append(
              $('<div>')
                .addClass('stories-btn-placeholder')
                .text(story.title[0] || '?')
            );
          }
          $createBtn.after($item);
        });
      });
};
