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
            group(Preview)
            {
                ShowCaption = false;
                Visible = HasAttachments;

                usercontrol(PDFViewer; "PDFV2 PDF Viewer")
                {
                    ApplicationArea = All;

                    trigger ControlAddinReady()
                    begin
                        AddInIsReady := true;
                        GalleryLoaded := false;
                        ShowGallery();
                    end;

                    trigger DocumentRequested(AttachmentId: Text)
                    begin
                        SendAttachment(AttachmentId);
                    end;
                }
            }
        }
    }

    var
        AddInIsReady: Boolean;
        GalleryFilters: Text;
        GalleryLoaded: Boolean;
        HasAttachments: Boolean;
        AttachmentGoneTxt: Label 'This attachment is no longer available.';
        LoadingTxt: Label 'Loading...';
        NoContentTxt: Label 'This attachment is empty, so there is nothing to preview.';
        NoPreviewForTypeTxt: Label 'No preview for %1 files. Attach a PDF or an image version to see it here.', Comment = '%1 = upper case file extension, for example XLSX';
        NoPreviewTxt: Label 'No preview for this file type. Attach a PDF or an image version to see it here.';

    trigger OnAfterGetCurrRecord()
    begin
        UpdateVisibility();
        ShowGallery();
    end;

    local procedure UpdateVisibility()
    var
        Attachment: Record "Document Attachment";
    begin
        Attachment.CopyFilters(Rec);
        HasAttachments := not Attachment.IsEmpty();
    end;

    local procedure ShowGallery()
    var
        Attachment: Record "Document Attachment";
        Items: JsonArray;
        CurrentFilters: Text;
        ItemsJson: Text;
    begin
        if not AddInIsReady then
            exit;

        if not HasAttachments then begin
            GalleryLoaded := false;
            exit;
        end;

        CurrentFilters := Rec.GetFilters();
        if GalleryLoaded and (CurrentFilters = GalleryFilters) then
            exit;

        GalleryFilters := CurrentFilters;
        GalleryLoaded := true;

        Attachment.CopyFilters(Rec);
        if Attachment.FindSet() then
            repeat
                Items.Add(AttachmentItem(Attachment));
            until Attachment.Next() = 0;

        Items.WriteTo(ItemsJson);

        CurrPage.PDFViewer.SetVisible(true);
        CurrPage.PDFViewer.LoadGallery(ItemsJson, LoadingTxt, true);
    end;

    local procedure AttachmentItem(Attachment: Record "Document Attachment"): JsonObject
    var
        Item: JsonObject;
        ContentType: Text;
    begin
        ContentType := GetPreviewContentType(Attachment);

        Item.Add('id', Format(Attachment.SystemId));
        Item.Add('name', AttachmentFileName(Attachment));
        Item.Add('contentType', ContentType);

        if ContentType = '' then
            Item.Add('note', NoPreviewNote(Attachment));

        exit(Item);
    end;

    local procedure NoPreviewNote(Attachment: Record "Document Attachment"): Text
    var
        FileExtension: Text;
    begin
        if not Attachment."Document Reference ID".HasValue() then
            exit(NoContentTxt);

        FileExtension := DelChr(Attachment."File Extension", '<', '.');
        if FileExtension = '' then
            exit(NoPreviewTxt);

        exit(StrSubstNo(NoPreviewForTypeTxt, UpperCase(FileExtension)));
    end;

    local procedure SendAttachment(AttachmentId: Text)
    var
        Attachment: Record "Document Attachment";
        Base64Convert: Codeunit "Base64 Convert";
        TempBlob: Codeunit "Temp Blob";
        AttachmentSystemId: Guid;
        AttachmentInStream: InStream;
        AttachmentOutStream: OutStream;
        ContentType: Text;
    begin
        if not Evaluate(AttachmentSystemId, AttachmentId) then
            exit;

        if not Attachment.GetBySystemId(AttachmentSystemId) then begin
            CurrPage.PDFViewer.LoadGalleryNote(AttachmentId, AttachmentGoneTxt);
            exit;
        end;

        ContentType := GetPreviewContentType(Attachment);
        if ContentType = '' then begin
            CurrPage.PDFViewer.LoadGalleryNote(AttachmentId, NoContentTxt);
            exit;
        end;

        TempBlob.CreateOutStream(AttachmentOutStream);
        Attachment."Document Reference ID".ExportStream(AttachmentOutStream);
        TempBlob.CreateInStream(AttachmentInStream);

        CurrPage.PDFViewer.LoadGalleryDocument(
            AttachmentId, Base64Convert.ToBase64(AttachmentInStream), ContentType);
    end;

    local procedure AttachmentFileName(Attachment: Record "Document Attachment"): Text
    begin
        if Attachment."File Extension" = '' then
            exit(Attachment."File Name");

        exit(Attachment."File Name" + '.' + Attachment."File Extension");
    end;

    local procedure GetPreviewContentType(Attachment: Record "Document Attachment"): Text
    begin
        if not Attachment."Document Reference ID".HasValue() then
            exit('');

        case LowerCase(DelChr(Attachment."File Extension", '<', '.')) of
            'pdf':
                exit('application/pdf');
            'jpg', 'jpeg':
                exit('image/jpeg');
            'png':
                exit('image/png');
        end;

        if Attachment."File Type" = Attachment."File Type"::PDF then
            exit('application/pdf');

        exit('');
    end;
}
