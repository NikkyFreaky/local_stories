/* eslint-disable linebreak-style */
define(['jquery', 'core/ajax', 'core/notification'], function (
  $,
  Ajax,
  Notification
) {
  'use strict';

  /**
   * Сохраняет историю
   * @param {Object} data Данные истории
   * @returns {Promise}
   */
  function saveStory(data) {
    return Ajax.call([
      {
        methodname: 'local_stories_create_story',
        args: data,
      },
    ])[0]
      .then(function (response) {
        if (!response || typeof response.id === 'undefined') {
          throw new Error('Invalid server response: story ID is missing');
        }
        return response;
      })
      .catch(Notification.exception);
  }

  /**
   * Публикует историю
   * @param {number} storyId ID истории
   * @param {boolean} publish true для публикации, false для снятия с публикации
   * @returns {Promise}
   */
  function publishStory(storyId, publish = true) {
    return Ajax.call([
      {
        methodname: 'local_stories_publish_story',
        args: {
          story_id: storyId,
          publish: publish,
        },
      },
    ])[0].catch(Notification.exception);
  }

  /**
   * Загружает файл на сервер
   * @param {File} file Файл для загрузки
   * @returns {Promise<string>} URL загруженного файла
   */
  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        const base64data = reader.result.split(',')[1];

        Ajax.call([
          {
            methodname: 'local_stories_upload_file',
            args: {
              filedata: base64data,
              filename: file.name,
              filetype: file.type,
            },
          },
        ])[0]
          .then(function (response) {
            if (!response || !response.url) {
              throw new Error('Failed to upload file');
            }
            resolve(response.url);
          })
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    init: function () {
      // Инициализируем модальное окно
      const modal = $('#stories-modal');

      /**
       * Закрывает модальное окно и очищает состояние
       */
      function closeModal() {
        slides = [];
        currentSlide = 0;
        renderTextBlocks();
        setTextPanelVisible(false);
        resetPreview();
        updateSlidesPanel();
        if (
          window.StoriesModal &&
          typeof window.StoriesModal.hide === 'function'
        ) {
          window.StoriesModal.hide();
        } else {
          modal.removeClass('show').css('display', '').removeAttr('aria-modal');
          $('.modal-backdrop').remove();
          $('body').removeClass('modal-open');
        }
      }

      /**
       * Пытается закрыть модальное окно с подтверждением при необходимости
       * @param {Event} [e] - Событие, вызвавшее закрытие
       */
      function tryCloseModal(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (slides.some(hasContent)) {
          if (!confirmOpen) {
            showConfirmModal(
              'Вы действительно хотите закрыть окно? Весь добавленный контент будет удалён.',
              closeModal
            );
          }
          return false;
        } else {
          closeModal();
        }
      }

      // Инициализируем модальное окно с нашими настройками
      if (window.bootstrap && window.bootstrap.Modal) {
        // Отключаем debug-панель для этого компонента
        if (window.M && window.M.reactive) {
          window.M.reactive.debug = false;
        }
        window.StoriesModal = new window.bootstrap.Modal(modal[0], {
          backdrop: 'static',
          keyboard: false,
        });
      }

      // Обработчик для кнопки закрытия
      modal.find('[data-action="close-modal"]').on('click', tryCloseModal);

      // Обработчик для клика по backdrop
      modal.on('hide.bs.modal', function (e) {
        if (!confirmOpen) {
          e.preventDefault();
          tryCloseModal(e);
        }
      });

      // Обработчик для клавиши Esc
      $(document).on('keydown.stories-modal', function (e) {
        if (e.key === 'Escape' && modal.hasClass('show')) {
          tryCloseModal(e);
        }
      });

      // Предотвращаем автозаполнение
      modal.on('show.bs.modal', function () {
        $(this).find('input, select').attr('autocomplete', 'off');
      });

      const fileInput = modal.find('.stories-editor__file-input');
      const dropzone = modal.find('.stories-editor__dropzone');
      const canvas = modal.find('.stories-editor__canvas');
      const imgPreview = modal.find('.stories-editor__preview-image');
      const videoPreview = modal.find('.stories-editor__preview-video');
      const previewContainer = modal.find('.stories-editor__preview-container');

      let currentImageUrl = null;
      let currentVideoUrl = null;

      /**
       * Показывает предпросмотр для выбранного файла
       * @param {File} file - Файл для предпросмотра
       */
      function showPreview(file) {
        resetPreview();
        if (file.type.startsWith('image/')) {
          if (currentImageUrl) {
            URL.revokeObjectURL(currentImageUrl);
            currentImageUrl = null;
          }
          currentImageUrl = URL.createObjectURL(file);
          imgPreview.attr('src', currentImageUrl).show();
          if (slides.length === 0) {
            slides.push({
              bg: null,
              media: file,
              mediaType: 'image',
              duration: 5000,
              texts: [],
            });
            currentSlide = 0;
          } else {
            saveCurrentSlideState();
            slides[currentSlide].bg = null;
            slides[currentSlide].media = file;
            slides[currentSlide].mediaType = 'image';
            slides[currentSlide].duration = 5000;
          }
          updateSlidesPanel();
          updateTextBtnState();
          updateAddBtnState();
          updateBgBtnState();
        } else if (file.type.startsWith('video/')) {
          if (currentVideoUrl) {
            URL.revokeObjectURL(currentVideoUrl);
            currentVideoUrl = null;
          }
          currentVideoUrl = URL.createObjectURL(file);
          videoPreview.attr('src', currentVideoUrl).show();
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.src = currentVideoUrl;
          tempVideo.onloadedmetadata = function () {
            let duration = Math.floor(tempVideo.duration * 1000);
            if (duration > 60000) {
              duration = 60000;
            }
            if (slides.length === 0) {
              slides.push({
                bg: null,
                media: file,
                mediaType: 'video',
                duration: duration,
                texts: [],
              });
              currentSlide = 0;
            } else {
              saveCurrentSlideState();
              slides[currentSlide].bg = null;
              slides[currentSlide].media = file;
              slides[currentSlide].mediaType = 'video';
              slides[currentSlide].duration = duration;
            }
            updateSlidesPanel();
            updateTextBtnState();
            updateAddBtnState();
            updateBgBtnState();
          };
        }
        previewContainer.show();
        dropzone.hide();
        canvas.addClass('stories-editor__canvas--has-content');
        canvas.css('background', '');
        canvas.removeClass('stories-editor__canvas--has-bg');
        modal.find('.stories-editor__bg-color').removeClass('active');
      }

      // --- Dropzone/preview ---
      fileInput.on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
          showPreview(file);
        }
      });

      dropzone.on('dragenter dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.addClass('stories-editor__dropzone--dragover');
      });

      dropzone.on('dragleave dragend drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.removeClass('stories-editor__dropzone--dragover');
      });

      dropzone.on('drop', function (e) {
        const file = e.originalEvent.dataTransfer.files[0];
        if (file) {
          showPreview(file);
        }
      });

      // --- Выбор фона ---
      const bgColors = ['#fff', '#ff0000', '#000', '#ff9900', '#00ff00'];

      /**
       * Генерирует палитру цветов для выбора фона
       */
      function renderBgPalette() {
        const palette = modal.find('.stories-editor__bg-palette');
        palette.empty();
        bgColors.forEach((color) => {
          palette.append(
            `<button class="stories-editor__bg-color" data-bg-color="${color}" style="background:${color}"></button>`
          );
        });
      }

      /**
       * Проверяет, можно ли установить фон для текущего слайда
       * @returns {boolean}
       */
      function canSetBackground() {
        if (slides.length === 0) {
          return true;
        }
        const currentSlideData = slides[currentSlide];
        return !currentSlideData || !currentSlideData.media;
      }

      /**
       * Обновляет состояние кнопки установки фона
       */
      function updateBgBtnState() {
        const bgBtn = modal.find(
          '.stories-editor__tool-bg[data-action="set-bg"]'
        );
        if (canSetBackground()) {
          bgBtn.prop('disabled', false).removeClass('disabled');
        } else {
          bgBtn.prop('disabled', true).addClass('disabled');
        }
      }

      modal
        .find('.stories-editor__tool-bg[data-action="set-bg"]')
        .on('click', function () {
          if (!canSetBackground()) {
            return;
          }
          const toolbar = $('#stories-modal').find('.stories-editor__toolbar');
          toolbar.removeClass('stories-editor__toolbar--text-open');
          if (slides.length === 0) {
            slides.push({
              bg: '#fff',
              media: null,
              mediaType: null,
              mediaUrl: null,
              texts: [],
            });
            currentSlide = 0;
          } else if (!hasContent(slides[currentSlide])) {
            slides[currentSlide].bg = '#fff';
            slides[currentSlide].media = null;
            slides[currentSlide].mediaType = null;
            slides[currentSlide].mediaUrl = null;
          } else if (slides[currentSlide].bg) {
            // Если на текущем слайде уже есть фон — просто открыть палитру для изменения
            // ничего не меняем в slides/currentSlide
          } else {
            saveCurrentSlideState();
            slides.push({
              bg: '#fff',
              media: null,
              mediaType: null,
              mediaUrl: null,
              texts: [],
            });
            currentSlide = slides.length - 1;
          }
          canvas.css('background', slides[currentSlide].bg || '#fff');
          canvas.addClass('stories-editor__canvas--has-bg');
          dropzone.hide();
          imgPreview.hide();
          videoPreview.hide();
          previewContainer.hide();
          canvas.removeClass('stories-editor__canvas--has-content');
          modal.find('.stories-editor__bg-color').removeClass('active');
          modal
            .find('.stories-editor__toolbar')
            .addClass('stories-editor__toolbar--bg-open');
          renderBgPalette();
          updateSlidesPanel();
          updateTextBtnState();
        });

      modal.on('click', '.stories-editor__bg-color', function () {
        const color = $(this).data('bg-color');
        canvas.css('background', color);
        canvas.addClass('stories-editor__canvas--has-bg');
        dropzone.hide();
        imgPreview.hide();
        videoPreview.hide();
        previewContainer.hide();
        canvas.removeClass('stories-editor__canvas--has-content');
        modal.find('.stories-editor__bg-color').removeClass('active');
        $(this).addClass('active');
        if (slides.length === 0) {
          slides.push({
            bg: color,
            media: null,
            mediaType: null,
            mediaUrl: null,
            texts: [],
          });
          currentSlide = 0;
        } else {
          saveCurrentSlideState();
          slides[currentSlide].bg = color;
          slides[currentSlide].media = null;
          slides[currentSlide].mediaType = null;
          slides[currentSlide].mediaUrl = null;
        }
        updateSlidesPanel();
        updateTextBtnState();
      });

      modal.on('click', '.stories-editor__bg-back', function () {
        modal
          .find('.stories-editor__toolbar')
          .removeClass('stories-editor__toolbar--bg-open');
      });

      // --- Слайды ---
      let slides = [];
      let currentSlide = 0;

      /**
       * Проверяет, есть ли контент на слайде
       * @param {Object} slide - Слайд для проверки
       * @returns {boolean}
       */
      function hasContent(slide) {
        if (!slide) {
          return false;
        }
        return !!(slide.bg || slide.media);
      }

      /**
       * Обновляет состояние кнопки добавления слайда
       */
      function updateAddBtnState() {
        const addBtn = modal.find('.stories-editor__slide-add');
        if (!slides.length || hasContent(slides[currentSlide])) {
          addBtn.prop('disabled', false);
        } else {
          addBtn.prop('disabled', true);
        }
      }

      modal
        .find('.stories-editor__slide-add')
        .off('click')
        .on('click', function () {
          if (!slides.length || hasContent(slides[currentSlide])) {
            saveCurrentSlideState();
            slides.push({bg: null, media: null, mediaType: null, texts: []});
            currentSlide = slides.length - 1;
            restoreSlideStateWithUI();
            updateSlidesPanel();
            // Скрыть палитру фона
            modal
              .find('.stories-editor__toolbar')
              .removeClass('stories-editor__toolbar--bg-open');
          }
        });

      /**
       * Сбрасывает предпросмотр и состояние canvas
       */
      function resetPreview() {
        if (currentImageUrl) {
          URL.revokeObjectURL(currentImageUrl);
          currentImageUrl = null;
        }
        if (currentVideoUrl) {
          URL.revokeObjectURL(currentVideoUrl);
          currentVideoUrl = null;
        }
        imgPreview.attr('src', '').hide();
        videoPreview.attr('src', '').hide();
        previewContainer.hide();
        dropzone.show();
        canvas.removeClass('stories-editor__canvas--has-content');
        canvas.removeClass('stories-editor__canvas--has-bg');
        canvas.css('background', '');
        modal.find('.stories-editor__bg-color').removeClass('active');
        modal
          .find('.stories-editor__toolbar')
          .removeClass('stories-editor__toolbar--bg-open');
        updateBgBtnState();
      }

      // Устанавливаем callback для подтверждения закрытия
      if (
        window.StoriesModal &&
        typeof window.StoriesModal.setConfirmCallback === 'function'
      ) {
        window.StoriesModal.setConfirmCallback(function () {
          return slides.some(hasContent);
        });
      }

      // Устанавливаем callback для очистки при закрытии
      if (
        window.StoriesModal &&
        typeof window.StoriesModal.setCleanupCallback === 'function'
      ) {
        window.StoriesModal.setCleanupCallback(function () {
          slides = [];
          currentSlide = 0;
          renderTextBlocks();
          setTextPanelVisible(false);
          resetPreview();
          updateSlidesPanel();
        });
      }

      /**
       * Создаёт дефолтный текстовый блок
       * @returns {Object}
       * Используется при добавлении нового текстового блока (см. реализацию ниже)
       */
      function createDefaultTextBlock() {
        return {
          id: 'text_' + Math.random().toString(36).substr(2, 9),
          text: 'Текст',
          x: 120,
          y: 120,
          color: '#000',
          size: 32,
          align: 'center',
        };
      }

      /**
       * Мигрирует старые слайды, добавляя поле texts если его нет
       */
      function migrateSlides() {
        slides.forEach((slide) => {
          if (!slide.texts) {
            slide.texts = [];
          }
        });
      }

      /**
       * Рендерит текстовые блоки на canvas
       */
      function renderTextBlocks() {
        const canvas = $('#stories-modal').find('.stories-editor__canvas');
        canvas.find('.stories-text-block').remove();
        const slide = slides[currentSlide];
        if (!slide || !slide.texts) {
          return;
        }
        slide.texts.forEach((block) => {
          const $div = $('<div class="stories-text-block"></div>')
            .attr('data-id', block.id)
            .css({
              left: block.x + 'px',
              top: block.y + 'px',
              color: block.color,
              fontSize: block.size + 'px',
              textAlign: block.align,
            })
            .text(block.text)
            .prepend(
              '<span class="stories-text-drag" title="Переместить">⠿</span>'
            )
            .append(
              '<span class="stories-text-delete" title="Удалить">✕</span>'
            );

          // Навешиваю обработчик удаления
          $div.find('.stories-text-delete').on('click', function (e) {
            e.stopPropagation();
            const id = $(this).closest('.stories-text-block').data('id');
            const slide = slides[currentSlide];
            if (!slide) {
              return;
            }
            slide.texts = slide.texts.filter((t) => t.id !== id);
            renderTextBlocks();
            selectTextBlockWithPanel(null);
          });

          // Навешиваю обработчик двойного клика
          $div.on('dblclick', function (e) {
            if ($(e.target).hasClass('stories-text-delete')) {
              return;
            }
            const id = $(this).data('id');
            const slide = slides[currentSlide];
            if (!slide) {
              return;
            }
            const block = slide.texts.find((t) => t.id === id);
            if (!block) {
              return;
            }
            if ($div.find('.stories-text-edit').length) {
              return;
            }
            const $textarea = $(
              '<textarea class="stories-text-edit"></textarea>'
            ).val(block.text);
            $div.empty().append($textarea);
            $textarea.focus().select();

            /**
             * Автоматически изменяет размер textarea под контент
             * @param {HTMLTextAreaElement} textarea
             */
            function autoResizeTextarea(textarea) {
              // Сначала сбрасываем высоту, чтобы получить правильный scrollHeight
              textarea.style.height = 'auto';
              textarea.style.height =
                Math.max(32, textarea.scrollHeight) + 'px';

              // Получаем максимальную ширину от родителя
              const parentWidth = $(textarea).parent().width();
              // Устанавливаем временную ширину для измерения
              textarea.style.width = '1px';
              // Получаем реальную ширину контента
              const contentWidth = Math.max(40, textarea.scrollWidth);
              // Устанавливаем финальную ширину с учетом ограничений
              textarea.style.width = Math.min(contentWidth, parentWidth) + 'px';
            }

            // Изменение размера при вводе
            $textarea.on('input', function () {
              autoResizeTextarea(this);
            });

            // Начальное изменение размера
            autoResizeTextarea($textarea[0]);

            /**
             * Сохраняет изменения текста из textarea
             */
            function saveEdit() {
              block.text = $textarea.val();
              renderTextBlocks();
              selectTextBlockWithPanel(block.id);
            }
            $textarea.on('blur', saveEdit);
            $textarea.on('keydown', function (ev) {
              if (ev.key === 'Enter' && (ev.ctrlKey || ev.shiftKey)) {
                ev.preventDefault();
                $textarea.blur();
              }
            });
          });

          canvas.append($div);
        });
      }

      /**
       * Обновляет панель слайдов
       */
      function updateSlidesPanel() {
        const panel = modal.find('.stories-editor__slides-panel');
        const list = panel.find('.stories-editor__slides-list');
        list.empty();
        if (slides.length === 0) {
          panel.hide();
          return;
        }
        slides.forEach((slide, idx) => {
          const btn = $(`<button>${idx + 1}</button>`);
          if (idx === currentSlide) {
            btn.addClass('active');
          }
          let delBtn = '';
          if (slides.length > 1) {
            delBtn = `<span class="stories-editor__slide-delete" data-slide-idx="${idx}" title="Удалить">×</span>`;
          }
          const wrapper = $('<span class="slide-btn-wrapper"></span>');
          wrapper.append(btn).append(delBtn);
          btn.on('click', function () {
            // Проверяем текущий слайд перед переключением
            if (currentSlide >= 0 && currentSlide < slides.length) {
              const currentSlideObj = slides[currentSlide];
              if (!hasContent(currentSlideObj)) {
                // Если текущий слайд пустой - удаляем его
                slides.splice(currentSlide, 1);
                // Корректируем индекс, если удаляемый слайд был перед целевым
                if (currentSlide < idx) {
                  idx--;
                }
                // Если удаляем последний слайд
                if (idx >= slides.length) {
                  idx = slides.length - 1;
                }
              } else {
                saveCurrentSlideState();
              }
            }
            currentSlide = idx;
            restoreSlideStateWithUI();
            updateSlidesPanel();
          });
          list.append(wrapper);
        });
        panel.show();
        updateAddBtnState();
        updateBgBtnState();
      }

      /**
       * Сохраняет состояние текущего слайда
       */
      function saveCurrentSlideState() {
        if (
          slides.length === 0 ||
          currentSlide < 0 ||
          currentSlide >= slides.length
        ) {
          return;
        }
        slides[currentSlide] = {
          bg: canvas.css('background-color') || null,
          media: slides[currentSlide].media || null,
          mediaType: imgPreview.is(':visible')
            ? 'image'
            : videoPreview.is(':visible')
            ? 'video'
            : null,
          mediaUrl: slides[currentSlide].mediaUrl || null,
          texts: slides[currentSlide].texts || [],
        };
      }

      /**
       * Восстанавливает состояние выбранного слайда
       */
      function restoreSlideState() {
        resetPreview();
        migrateSlides();
        const slide = slides[currentSlide];
        if (slide.bg) {
          canvas.css('background', slide.bg);
          canvas.addClass('stories-editor__canvas--has-bg');
          dropzone.hide();
        }
        if (slide.media && slide.mediaType) {
          if (slide.mediaType === 'image') {
            imgPreview.attr('src', slide.media).show();
          } else if (slide.mediaType === 'video') {
            videoPreview.attr('src', slide.media).show();
          }
          previewContainer.show();
          dropzone.hide();
          canvas.addClass('stories-editor__canvas--has-content');
        }
        renderTextBlocks();
      }

      /**
       * Обновляет UI после смены слайда: состояние кнопок и панели редактирования.
       */
      function restoreSlideStateWithUI() {
        restoreSlideState();
        updateTextBtnState();
        setTextPanelVisible(false);
        updateAddBtnState();
      }

      // --- Кастомный confirm ---
      let confirmOpen = false;
      /**
       * Показывает кастомное модальное окно подтверждения
       * @param {string} text Текст подтверждения
       * @param {function} onok Callback при подтверждении
       */
      function showConfirmModal(text, onok) {
        if (confirmOpen) {
          return;
        }
        confirmOpen = true;
        const modalEl = $('.stories-confirm-modal');
        modalEl.find('.stories-confirm-modal__text').text(text);
        modalEl.show();
        /**
         * Закрывает модальное окно подтверждения
         */
        function close() {
          modalEl.hide();
          confirmOpen = false;
        }
        modalEl
          .find('.stories-confirm-modal__btn--ok')
          .off('click')
          .on('click', function () {
            close();
            if (onok) {
              onok();
            }
          });
        modalEl
          .find('.stories-confirm-modal__btn--cancel')
          .off('click')
          .on('click', close);
        modalEl
          .find('.stories-confirm-modal__overlay')
          .off('click')
          .on('click', close);
      }

      // --- Текстовые блоки ---
      const textPanel = modal.find('.stories-editor__text-panel');
      const addTextBtn = textPanel.find('.stories-editor__text-add');
      const toolTextBtn = modal.find('.stories-editor__tool-text');

      /**
       * Управляет видимостью панели редактирования текста через класс тулбара
       * @param {boolean} visible
       */
      function setTextPanelVisible(visible) {
        const toolbar = $('#stories-modal').find('.stories-editor__toolbar');
        if (visible) {
          toolbar.addClass('stories-editor__toolbar--text-open');
          toolbar.removeClass('stories-editor__toolbar--bg-open');
        } else {
          toolbar.removeClass('stories-editor__toolbar--text-open');
          // Сброс выделения
          canvas.find('.stories-text-block').removeClass('selected');
        }
      }

      /**
       * Выделяет текстовый блок по id и управляет панелью
       * @param {string|null} id
       */
      function selectTextBlock(id) {
        canvas.find('.stories-text-block').removeClass('selected');
        if (id) {
          canvas
            .find('.stories-text-block[data-id="' + id + '"]')
            .addClass('selected');
          setTextPanelVisible(true);
        } else {
          const slide = slides[currentSlide];
          if (!slide || !slide.texts || slide.texts.length === 0) {
            setTextPanelVisible(false);
          }
          // если есть хотя бы один блок — панель не скрываем
        }
      }
      /**
       * Выделяет текстовый блок и синхронизирует панель
       * @param {string|null} id
       */
      function selectTextBlockWithPanel(id) {
        selectTextBlock(id);
        if (id) {
          syncPanelWithBlock();
        }
      }

      // --- Обработчики панели ---
      /**
       * Обработка выбора размера
       */
      textPanel.on('change', '.stories-editor__text-size', function () {
        applyPanelToBlock();
      });
      /**
       * Обработка выбора цвета
       */
      textPanel.on('click', '.stories-editor__text-colors button', function () {
        textPanel
          .find('.stories-editor__text-colors button')
          .removeClass('active');
        $(this).addClass('active');
        applyPanelToBlock();
      });
      /**
       * Обработка выбора выравнивания
       */
      textPanel.on('click', '.stories-editor__text-align button', function () {
        textPanel
          .find('.stories-editor__text-align button')
          .removeClass('active');
        $(this).addClass('active');
        applyPanelToBlock();
      });

      /**
       * Синхронизирует значения панели с выделенным блоком
       */
      function syncPanelWithBlock() {
        const slide = slides[currentSlide];
        const id = canvas.find('.stories-text-block.selected').data('id');
        if (!id) {
          return;
        }
        const block = slide.texts.find((t) => t.id === id);
        if (!block) {
          return;
        }
        textPanel.find('.stories-editor__text-size').val(block.size);
        textPanel
          .find('.stories-editor__text-colors button')
          .removeClass('active');
        textPanel
          .find(
            '.stories-editor__text-colors button[data-color="' +
              block.color +
              '"]'
          )
          .addClass('active');
        textPanel
          .find('.stories-editor__text-align button')
          .removeClass('active');
        textPanel
          .find(
            '.stories-editor__text-align button[data-align="' +
              block.align +
              '"]'
          )
          .addClass('active');
      }

      /**
       * Применяет изменения из панели к выделенному блоку
       */
      function applyPanelToBlock() {
        const slide = slides[currentSlide];
        const id = canvas.find('.stories-text-block.selected').data('id');
        if (!id) {
          return;
        }
        const block = slide.texts.find((t) => t.id === id);
        if (!block) {
          return;
        }
        block.size = parseInt(
          textPanel.find('.stories-editor__text-size').val(),
          10
        );
        const colorBtn = textPanel.find(
          '.stories-editor__text-colors button.active'
        );
        if (colorBtn.length) {
          block.color = colorBtn.data('color');
        }
        const alignBtn = textPanel.find(
          '.stories-editor__text-align button.active'
        );
        if (alignBtn.length) {
          block.align = alignBtn.data('align');
        }
        renderTextBlocks();
        selectTextBlockWithPanel(block.id);
      }

      /**
       * Проверяет, можно ли добавлять текст на слайд
       * @returns {boolean}
       */
      function canAddText() {
        const slide = slides[currentSlide];
        if (!slide) {
          return false;
        }
        if (slide.mediaType === 'video') {
          return false;
        }
        return !!(slide.bg || slide.mediaType === 'image');
      }

      /**
       * Деактивирует кнопки добавления текста, если нельзя
       */
      function updateTextBtnState() {
        const disabled = !canAddText();
        toolTextBtn.prop('disabled', disabled);
        addTextBtn.prop('disabled', disabled);
      }

      /**
       * Добавляет новый текстовый блок на слайд
       */
      function addTextBlock() {
        if (!canAddText()) {
          return;
        }
        const slide = slides[currentSlide];
        const block = createDefaultTextBlock();
        slide.texts.push(block);
        renderTextBlocks();
        selectTextBlockWithPanel(block.id);
      }

      // Клик по кнопке панели
      addTextBtn.on('click', function () {
        addTextBlock();
      });
      // Клик по кнопке тулбара
      toolTextBtn.on('click', function () {
        const slide = slides[currentSlide];
        if (!slide) {
          return;
        }
        if (slide.texts && slide.texts.length > 0) {
          renderTextBlocks();
          selectTextBlockWithPanel(slide.texts[0].id);
        } else {
          addTextBlock();
        }
      });

      // Клик по текстовому блоку — выделение
      canvas.on('click', '.stories-text-block', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        selectTextBlockWithPanel(id);
      });
      // Клик вне блока — снять выделение
      canvas.on('click', function (e) {
        if (!$(e.target).closest('.stories-text-block').length) {
          const slide = slides[currentSlide];
          if (!slide || !slide.texts || slide.texts.length === 0) {
            setTextPanelVisible(false);
          }
          // Если есть хотя бы один блок — панель не скрываем
          selectTextBlockWithPanel(null);
        }
      });

      // --- Drag-n-drop текстовых блоков ---
      let dragState = null;

      $(document).on('mousemove', function (e) {
        if (!dragState) {
          return;
        }
        const canvasW = canvas.innerWidth();
        const canvasH = canvas.innerHeight();
        const blockW = dragState.$el.outerWidth();
        const blockH = dragState.$el.outerHeight();
        let dx = e.pageX - dragState.startX;
        let dy = e.pageY - dragState.startY;
        let newX = dragState.origX + dx;
        let newY = dragState.origY + dy;
        // Ограничения с учётом padding/border
        newX = Math.max(0, Math.min(newX, canvasW - blockW));
        newY = Math.max(0, Math.min(newY, canvasH - blockH));
        dragState.$el.css({left: newX + 'px', top: newY + 'px'});
      });

      $(document).on('mouseup', function (e) {
        if (dragState) {
          const slide = slides[currentSlide];
          if (!slide) {
            dragState = null;
            return;
          }
          const block = slide.texts.find((t) => t.id === dragState.id);
          if (block) {
            const canvasW = canvas.innerWidth();
            const canvasH = canvas.innerHeight();
            const blockW = dragState.$el.outerWidth();
            const blockH = dragState.$el.outerHeight();
            let dx = e.pageX - dragState.startX;
            let dy = e.pageY - dragState.startY;
            let newX = dragState.origX + dx;
            let newY = dragState.origY + dy;
            newX = Math.max(0, Math.min(newX, canvasW - blockW));
            newY = Math.max(0, Math.min(newY, canvasH - blockH));
            block.x = newX;
            block.y = newY;
          }
          dragState = null;
          $(document.body).removeClass('stories-dragging');
          renderTextBlocks();
          selectTextBlockWithPanel(block ? block.id : null);
        }
      });

      canvas.on('mousedown', '.stories-text-drag', function (e) {
        if (e.button !== 0) {
          return;
        }
        const $block = $(this).closest('.stories-text-block');
        const id = $block.data('id');
        const slide = slides[currentSlide];
        if (!slide) {
          return;
        }
        const block = slide.texts.find((t) => t.id === id);
        if (!block) {
          return;
        }
        dragState = {
          id,
          startX: e.pageX,
          startY: e.pageY,
          origX: block.x,
          origY: block.y,
          $el: $block,
        };
        $(document.body).addClass('stories-dragging');
        e.preventDefault();
      });

      // --- Удаление текстового блока ---
      $('#stories-modal').on('click', '.stories-text-delete', function () {
        const id = $(this).closest('.stories-text-block').data('id');
        const slide = slides[currentSlide];
        if (!slide) {
          return;
        }
        slide.texts = slide.texts.filter((t) => t.id !== id);
        renderTextBlocks();
        selectTextBlockWithPanel(null);
      });

      // Кнопка "Назад" для панели редактирования текста
      textPanel.on('click', '.stories-editor__text-back', function () {
        setTextPanelVisible(false);
      });

      // --- Редактирование текста по двойному клику ---
      canvas.on('dblclick', function (e) {
        const $block = $(e.target).closest('.stories-text-block');
        if (!$block.length) {
          return;
        }
        if ($(e.target).hasClass('stories-text-delete')) {
          return;
        }
        const id = $block.data('id');
        const slide = slides[currentSlide];
        if (!slide) {
          return;
        }
        const block = slide.texts.find((t) => t.id === id);
        if (!block) {
          return;
        }
        // Уже редактируется — не вставлять второй раз
        if ($block.find('.stories-text-edit').length) {
          return;
        }
        // Вставляем textarea
        const $textarea = $(
          '<textarea class="stories-text-edit"></textarea>'
        ).val(block.text);
        $block.empty().append($textarea);
        $textarea.focus().select();

        /**
         * Автоматически изменяет размер textarea под контент
         * @param {HTMLTextAreaElement} textarea
         */
        function autoResizeTextarea(textarea) {
          // Сначала сбрасываем высоту, чтобы получить правильный scrollHeight
          textarea.style.height = 'auto';
          textarea.style.height = Math.max(32, textarea.scrollHeight) + 'px';

          // Получаем максимальную ширину от родителя
          const parentWidth = $(textarea).parent().width();
          // Устанавливаем временную ширину для измерения
          textarea.style.width = '1px';
          // Получаем реальную ширину контента
          const contentWidth = Math.max(40, textarea.scrollWidth);
          // Устанавливаем финальную ширину с учетом ограничений
          textarea.style.width = Math.min(contentWidth, parentWidth) + 'px';
        }

        // Изменение размера при вводе
        $textarea.on('input', function () {
          autoResizeTextarea(this);
        });

        // Начальное изменение размера
        autoResizeTextarea($textarea[0]);

        /**
         * Сохраняет изменения текста из textarea
         */
        function saveEdit() {
          block.text = $textarea.val();
          renderTextBlocks();
          selectTextBlockWithPanel(block.id);
        }
        $textarea.on('blur', saveEdit);
        $textarea.on('keydown', function (ev) {
          if (ev.key === 'Enter' && (ev.ctrlKey || ev.shiftKey)) {
            ev.preventDefault();
            $textarea.blur();
          }
        });
      });

      // --- Делегированный обработчик удаления слайда ---
      $(document)
        .off('click.stories-slide-delete')
        .on(
          'click.stories-slide-delete',
          '.stories-editor__slide-delete',
          function (e) {
            e.stopPropagation();
            if (confirmOpen) {
              return;
            }
            const idx = parseInt($(this).data('slide-idx'), 10);
            const panel = $('.stories-editor__slides-panel');
            showConfirmModal('Удалить этот слайд?', function () {
              slides.splice(idx, 1);
              if (currentSlide >= slides.length) {
                currentSlide = slides.length - 1;
              }
              restoreSlideStateWithUI();
              updateSlidesPanel();
              if (slides.length === 0) {
                panel.hide();
              }
            });
            return false;
          }
        );

      // --- Публикация истории ---
      modal.find('[data-action="publish-story"]').on('click', function () {
        if (!slides.length || !slides.some(hasContent)) {
          Notification.alert('Ошибка', 'Добавьте хотя бы один слайд');
          return;
        }

        // Загружаем все файлы перед сохранением
        const uploads = slides
          .filter((slide) => slide.media instanceof File)
          .map((slide) =>
            uploadFile(slide.media).then((url) => {
              slide.mediaUrl = url;
              delete slide.media;
            })
          );

        Promise.all(uploads)
          .then(() => {
            // console.log('DEBUG SLIDES:', JSON.stringify(slides, null, 2));
            window.DEBUG_SLIDES = JSON.parse(JSON.stringify(slides));
            // Проверка: все ли mediaUrl присутствуют для слайдов с mediaType
            const missingMedia = slides.some(
              (slide) =>
                slide.mediaType &&
                (slide.mediaType === 'image' || slide.mediaType === 'video') &&
                !slide.mediaUrl
            );
            if (missingMedia) {
              Notification.alert(
                'Ошибка',
                'Не удалось загрузить все медиафайлы. Попробуйте ещё раз.'
              );
              return Promise.reject('Missing mediaUrl');
            }
            const data = {
              title: 'Story ' + Date.now(),
              slides: slides.map((slide, index) => ({
                position: index,
                duration: slide.duration || 5000,
                background: slide.bg,
                media_type: slide.mediaType || null,
                media_url: slide.mediaUrl || null,
                texts: (slide.texts || []).map((text) => ({
                  text: text.text,
                  x: text.x,
                  y: text.y,
                  color: text.color,
                  size: text.size,
                  align: text.align,
                })),
              })),
            };

            return saveStory(data);
          })
          .then(function (response) {
            if (!response || !response.id) {
              throw new Error('Failed to create story: invalid response');
            }
            // Сразу публикуем историю
            return publishStory(response.id).then(function () {
              // Закрываем модальное окно
              closeModal();
              // Показываем уведомление об успехе
              Notification.addNotification({
                message: 'История опубликована',
                type: 'success',
              });
              // Перезагружаем страницу для обновления списка историй
              window.location.reload();
            });
          })
          .catch(function (error) {
            Notification.exception(error);
          });
      });

      // Обработчик сохранения истории
      modal.find('[data-action="save-story"]').on('click', function () {
        const title = modal.find('[name="title"]').val();
        if (!title) {
          Notification.alert('Ошибка', 'Введите название истории');
          return;
        }

        const data = {
          title: title,
          course_id: modal.find('[name="course_id"]').val() || null,
          expires_at: modal.find('[name="expires_at"]').val() || null,
          slides: slides.map((slide, index) => ({
            position: index,
            duration: slide.duration || 5000,
            background: slide.bg,
            media_type: slide.mediaType,
            media_url: slide.media,
            texts: (slide.texts || []).map((text) => ({
              text: text.text,
              x: text.x,
              y: text.y,
              color: text.color,
              size: text.size,
              align: text.align,
            })),
          })),
        };

        saveStory(data)
          .then(function (response) {
            // Закрываем модальное окно
            closeModal();
            // Показываем уведомление об успехе
            Notification.addNotification({
              message: 'История успешно создана',
              type: 'success',
            });
            // Если нужно опубликовать сразу
            if (modal.find('[name="publish"]').prop('checked')) {
              return publishStory(response.id);
            }
          })
          .then(function () {
            // Перезагружаем страницу для обновления списка историй
            window.location.reload();
          });
      });
    },
  };
});
