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

      /**
       * Сбрасывает предпросмотр и состояние canvas
       */
      function resetPreview() {
        imgPreview.attr('src', '').hide();
        videoPreview.attr('src', '').hide();
        previewContainer.hide();
        dropzone.show();
        canvas.removeClass('stories-editor__canvas--has-content');
      }

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
      }

      fileInput.on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
          showPreview(file);
        }
      });

      // Drag&Drop
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

      // Сброс при закрытии модалки
      modal.find('[data-action="close-modal"]').on('click', resetPreview);
    },
  };
});
