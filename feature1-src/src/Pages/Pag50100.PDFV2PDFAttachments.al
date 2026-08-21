page 50100 "PDFV2 PDF Attachments"
{
    Caption = 'PDF Attachments';
    PageType = ListPart;
    SourceTable = "Document Attachment";
    Editable = false;
    InsertAllowed = false;
    ModifyAllowed = false;
    DeleteAllowed = false;
    LinksAllowed = false;

    layout
    {
        area(content)
        {
            repeater(Attachments)
            {
                field(Name; Rec."File Name")
                {
                    ApplicationArea = All;
                    Caption = 'Name';
                    ToolTip = 'Specifies the name of the attached file. Select a row to preview PDF and image files below.';
                }
                field("File Extension"; Rec."File Extension")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the extension of the attached file.';
                }
                field("Attached Date"; Rec."Attached Date")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies when the file was attached.';
                }
            }
            group(Preview)
            {
                ShowCaption = false;
                usercontrol(PDFViewer; "PDFV2 PDF Viewer")
                {
                    ApplicationArea = All;

                    trigger ControlAddinReady()
                    begin
                        AddInIsReady := true;
                        ShowSelectedAttachment();
                    end;
                }
            }
        }
    }

    var
        AddInIsReady: Boolean;

    trigger OnAfterGetCurrRecord()
    begin
        ShowSelectedAttachment();
    end;

    /// <summary>
    /// Renders the attachment on the selected row in the add-in, or hides the
    /// viewer when the row holds something the add-in cannot display.
    /// </summary>
    local procedure ShowSelectedAttachment()
    var
        Base64Convert: Codeunit "Base64 Convert";
        TempBlob: Codeunit "Temp Blob";
        AttachmentInStream: InStream;
        AttachmentOutStream: OutStream;
        ContentType: Text;
    begin
        // OnAfterGetCurrRecord fires before the add-in has loaded its scripts.
        if not AddInIsReady then
            exit;

        ContentType := GetPreviewContentType();
        if ContentType = '' then begin
            CurrPage.PDFViewer.SetVisible(false);
            exit;
        end;

        TempBlob.CreateOutStream(AttachmentOutStream);
        Rec."Document Reference ID".ExportStream(AttachmentOutStream);
        TempBlob.CreateInStream(AttachmentInStream);

        CurrPage.PDFViewer.SetVisible(true);
        CurrPage.PDFViewer.LoadDocument(Base64Convert.ToBase64(AttachmentInStream), ContentType, true);
    end;

    /// <summary>
    /// Returns the MIME type the add-in should render the attachment as, or an
    /// empty string when the file is not a format the add-in can preview.
    /// </summary>
    local procedure GetPreviewContentType(): Text
    begin
        if not Rec."Document Reference ID".HasValue() then
            exit('');

        case LowerCase(DelChr(Rec."File Extension", '<', '.')) of
            'pdf':
                exit('application/pdf');
            'jpg', 'jpeg':
                exit('image/jpeg');
            'png':
                exit('image/png');
        end;

        // Attachments created without an extension still carry a file type.
        if Rec."File Type" = Rec."File Type"::PDF then
            exit('application/pdf');

        exit('');
    end;
}
