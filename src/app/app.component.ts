import {Component, Input, OnInit, ViewChild} from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    @ViewChild('editor') editor;
    isLoading = true;
    direction = 'horizontal';
    size = {
        editor: 50,
        viewer: 50
    };
    languages = [
        {id: 'html', name: 'HTML'},
        {id: 'javascript', name: 'Javascript'},
        {id: 'css', name: 'CSS'},
    ];
    editorOptions = {
        value: '// First line\nfunction hello() {\n\talert(\'Hello world!\');\n}\n// Last line',
        language: 'html',
        theme: 'vs-dark',
        renderMinimap: false,
        automaticLayout: true,
        scrollbar: {
            vertical: 'hidden'
        },
        minimap: {
            enabled: false
        }
    };
    code = `<html>
	<body>
		Hello world
	</body>
</html>`;

    constructor() {
    }

    ngOnInit() {
        setTimeout(() => {
            this.isLoading = false;
            this.run();
        }, 2000);
    }

    changeOrientation() {
        this.direction = this.direction === 'horizontal' ? 'vertical' : 'horizontal';
    }

    toggleView(view: number) {
        switch (view) {
            case 1:
                this.size.editor = 100;
                this.size.viewer = 0;
                break;
            case 2:
                this.size.editor = 50;
                this.size.viewer = 50;
                break;
            case 3:
                this.size.viewer = 100;
                this.size.editor = 0;
                break;

        }
    }

    run() {
        const viewer: any = document.getElementById('viewer');
        viewer.contentWindow.document.open();
        viewer.contentWindow.document.write(this.code);
        viewer.contentWindow.document.close();
    }

    changeLanguage(event) {
        this.editorOptions = Object.assign({}, this.editorOptions, {language: event.target.value});
    }
}
