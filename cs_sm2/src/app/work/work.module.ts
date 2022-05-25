import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WorkPageRoutingModule } from './work-routing.module';

import { WorkPage } from './work.page';
import { Demo1Page } from './demo1/demo1.page';
// import {demo1Page}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkPageRoutingModule,
    // Demo1Page
  ],
  declarations: [
    WorkPage,
    Demo1Page,
  ]
})
export class WorkPageModule { }
