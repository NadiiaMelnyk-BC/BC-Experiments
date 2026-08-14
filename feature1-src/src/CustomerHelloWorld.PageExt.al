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

        movefirst(factboxes; Control1905767507)
    }

    var
        HelloWorldMsg: Label 'Hello World';
}
