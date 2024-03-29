import { Component, OnInit } from '@angular/core';
import { AlertService } from 'src/app/shared/service/alert.service';
import { DatabaseService } from 'src/app/shared/service/database.service';
import { QuestionItem } from 'src/app/shared/data/questionSchema';

@Component({
  selector: 'app-browse',
  templateUrl: './browse.page.html',
  styleUrls: ['./browse.page.scss'],
})
export class BrowsePage implements OnInit {
  questionList;
  sList;
  sessionId;
  checkedQuestionList;

  currentSeg: string;
  nrList; //not checked question list
  irList; //checked question list

  constructor(
    private das: DatabaseService,
    private als: AlertService,
  ) {
    this.fetchSession();
    this.currentSeg = 'nr';
  }
  //fetch the checked list from database
  //with the checked list, update the list display in the browse page
  //specifically, depending on the status on the question (checked or not checked), 
  //they should be in different segment

  ngOnInit() { }

  async changeState() {
    // console.log(this.questionList);
    if (this.currentSeg == 'nr')
      for (let i = 0; i < this.questionList.length; i++) {
        const currentItem = this.questionList[i];
        if (currentItem.isChecked) {//if isChecked feature exist or equals true
          const element = await this.das.addSessionQuestionWithId(this.sessionId, currentItem.id);
          // console.log(currentItem);
        }
      }
    else
      for (let i = 0; i < this.questionList.length; i++) {
        const currentItem = this.questionList[i];
        if (currentItem.isChecked) {//if isChecked feature exist or equals true
          const element = await this.das.removeSessionQuestionWithId(this.sessionId, currentItem.docId);
          // console.log(currentItem);
        }
      }

    //refresh question
    this.updateQuestionData();
  }

  updateQuestionList() {
    //in the html page, display questions depending on the segment
    this.questionList = [];//reset the questionList
    if (this.currentSeg == 'nr') {
      this.questionList = this.nrList.map(v => v);
    } else {
      this.questionList = this.irList.map(v => v);
    }
  }

  async uploadCheckedQuestion() {
    console.log(this.questionList);
    if (this.currentSeg == 'nr')
      for (let i = 0; i < this.questionList.length; i++) {
        const currentItem = this.questionList[i];
        if (currentItem.isChecked) {//if isChecked feature exist or equals true
          // const element = await this.das.addSessionQuestionWithId(this.sessionId, currentItem.id);
          console.log(currentItem);
        }
      }
    else
      for (let i = 0; i < this.questionList.length; i++) {
        const currentItem = this.questionList[i];
        if (currentItem.isChecked) {//if isChecked feature exist or equals true
          // const element = await this.das.addSessionQuestionWithId(this.sessionId, currentItem.id);
          console.log(currentItem);
        }
      }
  }

  async updateQuestionData() {
    const loadingHandler = await this.als.startLoading();

    //get all the question that is already in the checked list
    this.checkedQuestionList = await this.das.getSessionQuestionWithId(this.sessionId);

    //fetch all the quesiton id, given the session code. Result store in list
    this.questionList = await this.das.filterQuestionData(this.sList.filter(
      e => e.id == this.sessionId)[0].sCode.toLowerCase());
    console.log(this.sessionId, this.questionList, this.sList.filter(
      e => e.id == this.sessionId)[0].sCode.toLowerCase());
    //with the questionList and checkedQuestionList, update the nr and ir list
    this.questionList.sort(this.termCompare);
    //first reset the list
    this.irList = []; this.nrList = [];
    while (this.questionList.length > 0) {
      var currentItem = this.questionList.pop();
      const checkItemHandler = this.checkedQuestionList.filter(e => e.qId == currentItem.id)
      if (checkItemHandler.length > 0) {
        //insert the docId: the id of the question in the session
        currentItem.docId = checkItemHandler[0].id;
        //it is released
        this.irList.push(currentItem);
      } else {
        //it is not released
        this.nrList.push(currentItem);
      }
    }
    // console.log(this.irList, this.nrList);
    this.updateQuestionList();//this update questionList on the html page
    loadingHandler.dismiss();
  }

  fetchSession() {//retrieve all the sessions from database, store it in sList
    this.sList = null;
    this.das.getSessionData('All').then(v => {
      this.sList = v;
      console.log(this.sList);
      // this.generateSessionList();
    });

  }

  termCompare(a, b) {
    if (a.des > b.des) {
      return -1;
    }
    if (a.des < b.des) {
      return 1;
    }
    return 0;
  }

}
