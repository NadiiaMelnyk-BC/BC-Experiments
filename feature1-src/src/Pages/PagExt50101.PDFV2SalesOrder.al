pageextension 50101 "PDFV2 Sales Order" extends "Sales Order"
{
    layout
    {
        addlast(factboxes)
        {
            part(PDFV2PDFAttachments; "PDFV2 PDF Attachments")
            {
                ApplicationArea = All;
                Caption = 'PDF Attachments';
                SubPageLink = "Table ID" = const(Database::"Sales Header"),
                              "No." = field("No."),
                              "Document Type" = field("Document Type");
            }
        }
    }
}
