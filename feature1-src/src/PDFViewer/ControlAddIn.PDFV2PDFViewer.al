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
    procedure LoadPDF(PDFDocument: Text; IsFactbox: Boolean)
    procedure SetVisible(IsVisible: Boolean)
}