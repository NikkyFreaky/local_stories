/* eslint-disable linebreak-style */
define(['jquery'], function ($) {
  return {
    init: function () {
      const modal = $('#stories-modal');
      const fileInput = modal.find('.stories-editor__file-input');
      const dropzone = modal.find('.stories-editor__dropzone');
      const canvas = modal.find('.stories-editor__canvas');
      const imgPreview = modal.find('.stories-editor__preview-image');
      const videoPreview = modal.find('.stories-editor__preview-video');
      const previewContainer = modal.find('.stories-editor__preview-container');

      // --- Слайды ---
      let slides = [];
      let currentSlide = 0;

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
              position: 'absolute',
              left: block.x + 'px',
              top: block.y + 'px',
              color: block.color,
              fontSize: block.size + 'px',
              textAlign: block.align,
              cursor: 'pointer',
              userSelect: 'none',
              zIndex: 10,
              minWidth: '40px',
              minHeight: '32px',
              padding: '2px 8px',
              background: 'transparent',
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
            const width = $div.width();
            const height = $div.height();
            const $textarea = $(
              '<textarea class="stories-text-edit"></textarea>'
            )
              .val(block.text)
              .css({width: width, height: height});
            $div.empty().append($textarea);
            $textarea.focus().select();
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
            saveCurrentSlideState();
            currentSlide = idx;
            restoreSlideStateWithUI();
            updateSlidesPanel();
          });
          list.append(wrapper);
        });
        panel.show();
        updateAddBtnState();
      }

      /**
       * Сохраняет состояние текущего слайда
       */
      function saveCurrentSlideState() {
        if (slides.length === 0) {
          return;
        }
        slides[currentSlide] = {
          bg: canvas.css('background-color') || null,
          media: imgPreview.is(':visible')
            ? imgPreview.attr('src')
            : videoPreview.is(':visible')
            ? videoPreview.attr('src')
            : null,
          mediaType: imgPreview.is(':visible')
            ? 'image'
            : videoPreview.is(':visible')
            ? 'video'
            : null,
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
       * Проверяет, есть ли контент на слайде
       * @param {Object} slide
       * @returns {boolean}
       */
      function hasContent(slide) {
        return !!(slide.bg || slide.media);
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

      // --- Подтверждение закрытия модалки ---
      /**
       * Обработчик закрытия модального окна с подтверждением
       */
      modal
        .find('[data-action="close-modal"]')
        .off('click')
        .on('click', function (e) {
          if (slides.some(hasContent)) {
            if (confirmOpen) {
              return false;
            }
            showConfirmModal(
              'Вы действительно хотите закрыть окно? Весь добавленный контент будет удалён.',
              function () {
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
                  modal
                    .removeClass('show')
                    .css('display', '')
                    .removeAttr('aria-modal');
                  $('.modal-backdrop').remove();
                  $('body').removeClass('modal-open');
                }
              }
            );
            e.preventDefault();
            e.stopPropagation();
            return false;
          } else {
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
              modal
                .removeClass('show')
                .css('display', '')
                .removeAttr('aria-modal');
              $('.modal-backdrop').remove();
              $('body').removeClass('modal-open');
            }
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
            `<button class=\"stories-editor__bg-color\" data-bg-color=\"${color}\" style=\"background:${color}\"\></button>`
          );
        });
      }
      modal
        .find('.stories-editor__tool-bg[data-action="set-bg"]')
        .on('click', function () {
          const toolbar = $('#stories-modal').find('.stories-editor__toolbar');
          toolbar.removeClass('stories-editor__toolbar--text-open');
          if (slides.length === 0) {
            slides.push({bg: '#fff', media: null, mediaType: null, texts: []});
            currentSlide = 0;
          } else if (!hasContent(slides[currentSlide])) {
            slides[currentSlide].bg = '#fff';
            slides[currentSlide].media = null;
            slides[currentSlide].mediaType = null;
          } else if (slides[currentSlide].bg) {
            // Если на текущем слайде уже есть фон — просто открыть палитру для изменения
            // ничего не меняем в slides/currentSlide
          } else {
            saveCurrentSlideState();
            slides.push({bg: '#fff', media: null, mediaType: null, texts: []});
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
          slides.push({bg: color, media: null, mediaType: null, texts: []});
          currentSlide = 0;
        } else {
          saveCurrentSlideState();
          slides[currentSlide].bg = color;
          slides[currentSlide].media = null;
          slides[currentSlide].mediaType = null;
        }
        updateSlidesPanel();
        updateTextBtnState();
      });
      modal.on('click', '.stories-editor__bg-back', function () {
        modal
          .find('.stories-editor__toolbar')
          .removeClass('stories-editor__toolbar--bg-open');
      });

      /**
       * Показывает предпросмотр для выбранного файла
       * @param {File} file
       */
      function showPreview(file) {
        resetPreview();
        if (file.type.startsWith('image/')) {
          imgPreview.attr('src', URL.createObjectURL(file)).show();
        } else if (file.type.startsWith('video/')) {
          videoPreview.attr('src', URL.createObjectURL(file)).show();
        }
        previewContainer.show();
        dropzone.hide();
        canvas.addClass('stories-editor__canvas--has-content');
        canvas.css('background', '');
        canvas.removeClass('stories-editor__canvas--has-bg');
        modal.find('.stories-editor__bg-color').removeClass('active');
        if (slides.length === 0) {
          slides.push({
            bg: null,
            media: file,
            mediaType: file.type.startsWith('image/') ? 'image' : 'video',
            texts: [],
          });
          currentSlide = 0;
        } else {
          saveCurrentSlideState();
          slides[currentSlide].bg = null;
          slides[currentSlide].media = file;
          slides[currentSlide].mediaType = file.type.startsWith('image/')
            ? 'image'
            : 'video';
        }
        updateSlidesPanel();
        updateTextBtnState();
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

      /**
       * Сбрасывает предпросмотр и состояние canvas
       */
      function resetPreview() {
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
      }

      // --- Закрытие по клику вне модалки ---
      $(document)
        .off('mousedown.stories-modal')
        .on('mousedown.stories-modal', function (e) {
          const $modal = $('#stories-modal');
          if (
            $modal.is(':visible') &&
            !$(e.target).closest('.modal-content').length
          ) {
            if (slides.some(hasContent)) {
              showConfirmModal(
                'Вы действительно хотите закрыть окно? Весь добавленный контент будет удалён.',
                function () {
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
                    $modal
                      .removeClass('show')
                      .css('display', '')
                      .removeAttr('aria-modal');
                    $('.modal-backdrop').remove();
                    $('body').removeClass('modal-open');
                  }
                }
              );
            } else {
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
                $modal
                  .removeClass('show')
                  .css('display', '')
                  .removeAttr('aria-modal');
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
              }
            }
          }
        });

      // --- Делегированный обработчик удаления слайда ---
      /**
       * Обработчик удаления слайда с подтверждением
       */
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
      /**
       * Обновляет UI после смены слайда: состояние кнопок и панели редактирования.
       */
      function restoreSlideStateWithUI() {
        restoreSlideState();
        updateTextBtnState();
        setTextPanelVisible(false);
      }

      // --- Drag-n-drop только по ручке ---
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
        // Сохраняем размеры
        const width = $block.width();
        const height = $block.height();
        // Вставляем textarea
        const $textarea = $('<textarea class="stories-text-edit"></textarea>')
          .val(block.text)
          .css({width: width, height: height});
        $block.empty().append($textarea);
        $textarea.focus().select();
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

      // --- Drag-n-drop только по ручке ---
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
    },
  };
});
