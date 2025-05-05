/* eslint-disable linebreak-style */
define(['jquery'], function ($) {
  'use strict';

  // Тестовые данные для прототипа
  const MOCK_STORY = {
    id: 1,
    slides: [
      {
        id: 1,
        duration: 5000,
        background: '#000',
        mediaType: 'image',
        mediaUrl: 'https://picsum.photos/800/600',
        texts: [
          {
            text: 'Тестовый текст 1',
            x: 50,
            y: 50,
            color: '#fff',
            size: 32,
            align: 'left',
          },
        ],
      },
      {
        id: 2,
        duration: 5000,
        background: '#222',
        mediaType: 'image',
        mediaUrl: 'https://picsum.photos/800/601',
        texts: [
          {
            text: 'Тестовый текст 2',
            x: 100,
            y: 100,
            color: '#fff',
            size: 24,
            align: 'center',
          },
        ],
      },
    ],
  };

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
      this.$pauseBtn = this.$modal.find('.stories-view-modal__pause');

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

      // Пауза/воспроизведение
      this.$pauseBtn.on('click', () => this.togglePause());

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

      // Клик по сторонам для навигации
      this.$modal.on('click', (e) => {
        if (!$(e.target).closest('.stories-view-modal__controls').length) {
          const clickX = e.clientX;
          const modalWidth = this.$modal.width();

          if (clickX < modalWidth * 0.3) {
            this.prevSlide();
          } else if (clickX > modalWidth * 0.7) {
            this.nextSlide();
          }
        }
      });
    }

    show(story = MOCK_STORY) {
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

      // Останавливаем предыдущий таймер
      this.stopTimer();

      // Обновляем прогресс
      this.$progressItems.children().removeClass('active viewed');
      this.$progressItems.children().slice(0, index).addClass('viewed');
      this.$progressItems.children().eq(index).addClass('active');

      // Очищаем предыдущий контент
      this.$image.hide().attr('src', '');
      this.$video.hide().attr('src', '');
      this.$texts.empty();

      // Загружаем медиа
      if (slide.mediaType === 'image') {
        this.$image.attr('src', slide.mediaUrl).show();
      } else if (slide.mediaType === 'video') {
        this.$video.attr('src', slide.mediaUrl).show();
        if (!this.isPaused) {
          this.$video[0].play();
        }
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
        this.currentSlideIndex--;
        this.loadSlide(this.currentSlideIndex);
      }
    }

    nextSlide() {
      if (this.currentSlideIndex < this.story.slides.length - 1) {
        this.currentSlideIndex++;
        this.loadSlide(this.currentSlideIndex);
      } else {
        this.hide();
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      this.$pauseBtn.toggleClass('paused', this.isPaused);

      if (this.isPaused) {
        this.stopTimer();
        if (this.$video.is(':visible')) {
          this.$video[0].pause();
        }
      } else {
        const slide = this.story.slides[this.currentSlideIndex];
        if (slide) {
          this.startTimer(slide.duration);
          if (this.$video.is(':visible')) {
            this.$video[0].play();
          }
        }
      }
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
        show: (story) => viewer.show(story),
      };

      // Для тестирования добавим кнопку в навбар
      $('.stories-nav').append(
        $('<button>')
          .addClass('stories-btn')
          .text('👁️')
          .attr('title', 'Просмотр тестовой истории')
          .on('click', () => viewer.show())
      );
    },
  };
});
