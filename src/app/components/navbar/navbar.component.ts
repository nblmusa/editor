import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  @Output() orientationChanged: EventEmitter<any> = new EventEmitter<any>();
  @Output() viewSizeChanged: EventEmitter<number> = new EventEmitter<number>();
  @Output() runClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() languageChanged: EventEmitter<string> = new EventEmitter<string>();

  languages = [
    {id: 'html', name: 'HTML'},
    {id: 'javascript', name: 'Javascript'},
    {id: 'typescript', name: 'Typescript'},
    {id: 'css', name: 'CSS'},
  ];

  constructor() { }

  ngOnInit(): void {
  }

  changeOrientation() {
    this.orientationChanged.emit();
  }

  toggleView(value: number) {
    this.viewSizeChanged.emit(value);
  }

  run() {
    this.runClicked.emit();
  }

  changeLanguage(value: any) {
    this.languageChanged.emit(value?.target?.value);
  }
}
