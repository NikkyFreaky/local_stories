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
          btn.on('click', function () {
            saveCurrentSlideState();
            currentSlide = idx;
            restoreSlideState();
            updateSlidesPanel();
          });
          list.append(btn);
        });
        panel.show();
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
        };
      }

      /**
       * Восстанавливает состояние выбранного слайда
       */
      function restoreSlideState() {
        resetPreview();
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
      }

      modal.find('.stories-editor__slide-add').on('click', function () {
        saveCurrentSlideState();
        slides.push({bg: null, media: null, mediaType: null});
        currentSlide = slides.length - 1;
        restoreSlideState();
        updateSlidesPanel();
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
          if (slides.length === 0) {
            slides.push({bg: '#fff', media: null, mediaType: null});
            currentSlide = 0;
          } else {
            saveCurrentSlideState();
            slides.push({bg: '#fff', media: null, mediaType: null});
            currentSlide = slides.length - 1;
          }
          canvas.css('background', '#fff');
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
          slides.push({bg: color, media: null, mediaType: null});
          currentSlide = 0;
        } else {
          saveCurrentSlideState();
          slides[currentSlide].bg = color;
          slides[currentSlide].media = null;
          slides[currentSlide].mediaType = null;
        }
        updateSlidesPanel();
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
      }
      modal.find('[data-action="close-modal"]').on('click', function () {
        slides = [];
        currentSlide = 0;
        resetPreview();
        updateSlidesPanel();
      });
    },
  };
});
