import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';


import {AppComponent} from './app.component';
import {AngularSplitModule} from 'angular-split';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import {FormsModule} from '@angular/forms';


@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        AngularSplitModule,
        FormsModule,
        MonacoEditorModule.forRoot()
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
