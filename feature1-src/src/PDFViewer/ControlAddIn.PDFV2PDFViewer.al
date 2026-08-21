controladdin "PDFV2 PDF Viewer"
{
    Scripts = 'src/PDFViewer/script.js';
    StartupScript = 'src/PDFViewer/Startup.js';
    StyleSheets = 'src/PDFViewer/stylesheet.css';

    MinimumHeight = 400;
    MinimumWidth = 100;
    MaximumHeight = 2000;
    MaximumWidth = 4000;
    HorizontalStretch = true;
    VerticalStretch = true;
    VerticalShrink = true;
    HorizontalShrink = true;

    event ControlAddinReady();

    /// <summary>
    /// Raised when a panel scrolls into view and needs its content. Panels are
    /// built empty so that a record with many attachments costs nothing until
    /// the user scrolls down to them.
    /// </summary>
    event DocumentRequested(AttachmentId: Text);

    /// <summary>
    /// Builds one empty panel per attachment. Items carry id, name and
    /// contentType, plus a note for the ones that cannot be previewed at all;
    /// the content itself arrives later, panel by panel. All display text comes
    /// from AL so that it stays translatable.
    /// </summary>
    procedure LoadGallery(ItemsJson: Text; LoadingText: Text; IsFactbox: Boolean)

    /// <summary>Fills a panel with content the browser can render itself.</summary>
    procedure LoadGalleryDocument(AttachmentId: Text; Base64Content: Text; ContentType: Text)

    /// <summary>Fills a panel with a message instead of content.</summary>
    procedure LoadGalleryNote(AttachmentId: Text; NoteText: Text)

    procedure SetVisible(IsVisible: Boolean)
}