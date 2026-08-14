pageextension 50100 CustomerHelloWorld extends "Customer Card"
{
    layout
    {
        addfirst(content)
        {
            field(HelloWorldMsg; HelloWorldMsg)
            {
                ApplicationArea = All;
                Caption = 'Greeting';
                Editable = false;
                ToolTip = 'A friendly greeting.';
            }
        }
    }

    var
        HelloWorldMsg: Label 'Hello World';
}
