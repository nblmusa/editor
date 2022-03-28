import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import Split from "split.js"
import {CodeModel} from "@ngstack/code-editor";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent  implements OnInit, AfterViewInit {
  @ViewChild('editor') editor: any;
  isLoading = true;
  direction: 'horizontal' | 'vertical' = 'horizontal';
  editorOptions = {
    theme: 'vs-dark',
    automaticLayout: true,
  };
  code: any = `<html>
	<body>
		Hello world
	</body>
</html>`;


  splitInstance: any;

  theme = 'vs-dark';
  codeModel: CodeModel = {
    language: 'html',
    uri: 'main.html',
    value: this.code,
  };


  onCodeChanged(value: any) {
    this.code = value;
    localStorage.setItem('split-content', JSON.stringify(value));
    this.run();
  }

  constructor() {
  }

  ngOnInit() {
    let content = JSON.parse(localStorage.getItem('split-content') as any);
    this.code = this.codeModel.value = content ? content : this.code;
    setTimeout(() => this.isLoading = false);
  }

  ngAfterViewInit() {
    this.initSplitPane();
  }

  initSplitPane() {
    let sizes = localStorage.getItem('split-sizes');
    sizes = sizes? JSON.parse(sizes) : [50, 50];

    let direction = localStorage.getItem('split-direction');
    this.direction = direction? JSON.parse(direction) : this.direction;

    this.splitInstance = Split(['#split-0', '#split-1'], {
      direction: this.direction,
      sizes: sizes as any,
      minSize: 10,
      snapOffset: 0,
      onDragEnd: function (sizes) {
        localStorage.setItem('split-sizes', JSON.stringify(sizes));
      },
    })

    this.run();
  }

  changeOrientation() {
    this.direction = this.direction === 'horizontal' ? 'vertical' : 'horizontal';
    localStorage.setItem('split-direction', JSON.stringify(this.direction))
    this.splitInstance.destroy();
    this.initSplitPane();
  }

  toggleView(view: number) {
    switch (view) {
      case 1:
        this.splitInstance.collapse(1);
        break;
      case 2:
        this.splitInstance.setSizes([50,50]);
        break;
      case 3:
        this.splitInstance.collapse(0);
        break;
    }

    localStorage.setItem('split-sizes', JSON.stringify(this.splitInstance.getSizes()));
  }

  run() {
    const viewer: any = document.getElementById('viewer');
    viewer.contentWindow.document.open();
    viewer.contentWindow.document.write(this.code);
    viewer.contentWindow.document.close();
  }

  changeLanguage(value: string) {
    this.codeModel = Object.assign({}, this.codeModel, {language: value});
  }
}
