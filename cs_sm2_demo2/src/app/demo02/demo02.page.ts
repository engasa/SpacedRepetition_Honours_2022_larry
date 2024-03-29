import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonItem } from '@ionic/angular';
import { threadId } from 'worker_threads';
import { questionList } from '../shared/data/newQuestionData';
import { UserRecordData } from '../shared/data/userRecordSchema';
import { AlertService } from '../shared/service/alert.service';
import { DatabaseService } from '../shared/service/database.service';
import { LocalStorageService } from '../shared/service/local-storage.service';
import { TimeService } from '../shared/service/time.service';
import { UserRecordService } from '../shared/service/user-record.service';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'app-demo02',
  templateUrl: './demo02.page.html',
  styleUrls: ['./demo02.page.scss'],
})
export class Demo02Page implements OnInit {
  @ViewChild('slides', { static: true }) slides: IonSlides;
  homeAddress: string = 'tabs/account';

  emotionSVG = [
    { value: 0, address: '../../assets/icon/emotion/00.svg', class: 'filter-00' },
    { value: 1, address: '../../assets/icon/emotion/01.svg', class: 'filter-01' },
    { value: 2, address: '../../assets/icon/emotion/02.svg', class: 'filter-02' },
    { value: 3, address: '../../assets/icon/emotion/03.svg', class: 'filter-03' },
    { value: 4, address: '../../assets/icon/emotion/04.svg', class: 'filter-04' },
    { value: 5, address: '../../assets/icon/emotion/05.svg', class: 'filter-05' },
  ]
  // qList = questionList;

  //stop using qList for front end display: now current Term item handles it
  qList: any[];//contains the list of all questions a user would answer today
  currentTermItem;
  // index: number;//new logic: only display the first item
  displayAnswer: boolean;
  // disableDisplayAnswer: boolean;
  sessionEnd: boolean;
  confirmMessage: boolean;
  userCode: string = '';
  userMulti: string = '';
  loaded: boolean = false;
  userAnswer: number = 3;
  todayProgress: number = 1;
  hoverIndex: number = 6;
  userAnswerMessage: string[] = [
    'complete blackout - 0',
    'incorrect response; the correct one remembered - 1',
    'incorrect response; where the correct one seemed easy to recall - 2',
    'correct response recalled with serious difficulty - 3',
    'correct response after a hesitation - 4',
    'perfect response - 5',
    ' - '
  ]
  //contains a list of all the questions
  sessionList: any[];

  constructor(
    public urs: UserRecordService,
    public das: DatabaseService,
    public los: LocalStorageService,
    public als: AlertService,
    public router: Router,
    public tms: TimeService,
  ) {
    // this.fetchFromRemoteDatabase();
  }

  ngOnInit() { }

  updateQuestionProgress() {
    if (this.qList != null || this.qList != undefined) {
      var initialQLength = 1;
      if (this.los.fetchLocalData('todayLimit') != null || this.los.fetchLocalData('todayLimit') != undefined) {
        initialQLength = this.los.fetchLocalData('todayLimit');
      }
      console.log(this.qList.length, initialQLength);
      this.todayProgress = 1 - this.qList.length / initialQLength;
    } else {
      this.todayProgress = 0;
    }
  }

  buttonSection(index) {
    // console.log('button section', index)
    this.hoverIndex = index;
  }
  buttonAway() {
    // this.hoverIndex = 6;
  }

  //when user has not select any session, 
  //then direct them back to home page to select question
  async ionViewDidEnter() {
    this.sessionList = this.los.fetchLocalData('userList');
    if (this.sessionList == null || this.sessionList.length < 1) {
      //no session, redirect page
      console.log('no session yet');
      const result = await this.als.expectFeedback("Please join a session before you start the task");
      this.router.navigate([this.homeAddress]);
    } else {
      //first initialize time
      this.updateQuestionProgress();
      if (this.tms.initializeAll()) {
        console.log('overTime, reset');
        const loading = await this.als.startLoading();
        this.sessionEnd = false;
        this.los.resetAnswerAndProgress();
        await this.fetchProgress();
        await this.decideQuestionList();
        this.updateQuestionDisplay();
        loading.dismiss();
      } else if (this.endProgress()) {
        console.log('loaded, session ended');
      } else if (this.inProgress()) {
        console.log('loaded, continue previous progress');
        this.qList = this.los.fetchLocalData('qList') as any[];
        this.updateQuestionDisplay();
        this.updateEnableDisplayAnswer();
        this.qList.forEach(e => {//display all the items in the qList
          console.log(e);
        });
        console.log('----------');
      } else {
        console.log('loaded, start today\'s session');
        await this.fetchProgress();
        await this.decideQuestionList();
        this.updateQuestionDisplay();
      }
      this.slides.slideTo(0);
      this.confirmMessage = this.los.getCheckBox();
    }
  }

  endProgress() {
    return this.sessionEnd;
  }

  inProgress() {
    const progress = this.los.fetchLocalData('qList');
    return progress != undefined && progress != null;
  }

  seeAnswer() {
    console.log('reveal');
    if (!this.sessionEnd) {
      this.check();
    }
  }

  async slideOnClick() {
    console.log('slide on click', this.slides.isEnd());
    if (await this.slides.isEnd())
      this.slides.slidePrev();
    else
      this.slides.slideNext();
  }

  //when user first time opens program, the software decides task list
  //read from local storge, fetch previous progress
  //read from current session list, add all new questions to list*

  //if a question belongs session question list, but does not belong user previous progress
  // then initialize the new process in the question
  async decideQuestionList() {
    console.log('decide question list');
    var dummyList = [];//this dummy list stores the list which user will look at today
    for (let i = 0; i < this.sessionList.length; i++) {
      //iterate through all sessions
      //(so user may join more than one session)
      const listQuestionId = await this.das.getSessionQuestionWithId(this.sessionList[i].id) as any[];
      console.log(this.sessionList[i].id, listQuestionId);
      for (let j = 0; j < listQuestionId.length; j++) {
        const insertItem = {
          qId: listQuestionId[j].qId,
          EF: 2.5,
          n: 0,//here repetition = 0 means this question is first time showing up
          repeatTime: -1,
        }
        dummyList.push(insertItem);
      }
    }
    const previous = this.los.fetchLocalData('previousProgress');
    //if it is time to review, then insert necessary information
    //if it is not, then remove this term from the list
    for (let i = 0; i < previous.length; i++) {
      const source = previous[i];
      // console.log(source);
      if (this.tms.getCurrentDay() >= source.nextTime) {//if system decides you to review today
        var target = dummyList.filter(e => e.qId == source.qId)[0];
        if (target != null && target != undefined) {
          target.EF = source.EF;
          target.n = source.n;
          target.docId = source.id;
        }
      } else {//if not, remove the corresponding item in the dummyList
        dummyList = dummyList.filter(e => e.qId != source.qId);
      }
    }
    // console.log(dummyList);
    this.qList = dummyList;
    console.log(this.qList)

    //set maximum
    //so the qList will not have element more than the daily maximum
    const dailyLimit = this.los.fetchLocalData('dailyLimit');
    this.qList = this.qList.slice(0, dailyLimit);
    console.log('qList', this.qList.length);
    this.los.setLocalData('todayLimit', this.qList.length)
    this.los.setLocalData('qList', this.qList);
    this.updateQuestionProgress();
  }

  async fetchProgress() {
    //collect data from database, store it in local storage
    //then initialize all the question as unanswered
    const previousList = await this.das.fetchUserPreviousProgress();
    if (previousList != null || previousList != undefined) {
      // console.log('user previous progress stored');
      this.los.setLocalData('previousProgress', previousList);
    }
  }

  //when user reads question
  //if local storage contains it, then read it
  //if not, read from remote database, and store it in local storage

  // async fetchFromRemoteDatabaseObsolete() {
  //   //then initialize all the question as unanswered
  //   const v = await this.das.getQuestionData();
  //   this.qList = v as any[];
  //   for (let i = 0; i < this.qList.length; i++) {
  //     this.qList[i].answered = false;
  //   }
  //   console.log(this.qList);
  //   const previousList = await this.das.fetchUserPreviousProgress();
  //   if (previousList != null || previousList != undefined) {
  //     console.log('true')
  //   }
  //   this.updateEnableDisplayAnswer();
  // }

  check() {//invoked in front end page to reveal the button
    console.log("check answer");
    this.displayAnswer = true;
  }

  updateEnableDisplayAnswer() {
    this.displayAnswer = false;
  }

  async updateQuestionDisplay() {
    this.currentTermItem = null;
    //if the length gets to 0 end this session
    if (this.qList.length == 0) {//end this session
      this.sessionEnd = true;
      //upload everything in this session to database
      this.urs.uploadAnswerAndProgress();
      this.los.setLocalData('qList', null);
    } else {
      console.log('before loading current Term')
      this.currentTermItem = await this.urs.fetchQuestionWithId(this.qList[0].qId);
    }
  }

  updateSelectionCheckBox() {
    // this.confirmMessage = !this.confirmMessage;
    console.log('updateSelection', this.confirmMessage);
    this.los.setLocalData('confirmSubmit', this.confirmMessage);
  }

  /*
  handle the responsive with user answer: repeat some of the question and store the others
      if user is first time answering this question
        if quality is easy, store info and end this right away
        if quality is not easy, store info and repeat this three time
      or if the user is attempting this question already
        if quality is poor or repeat, repeat it once
        if quality is good or easy, check if there are repeat time left
          if no repeat time left, store info end this
  */
  answer() {
    // const answer = this.userAnswer;
    const answerHover = this.hoverIndex;
    // this.confirmMessage = this.los.getCheckBox();
    // if (this.confirmMessage) {
    //   this.answerHelper();
    // } else {
    //   this.als.presentChoice('Button <b>' + answerHover + '</b> Selected').then(loadingItem => {
    //     if (loadingItem) {
    //       this.answerHelper();
    //       loadingItem.dismiss();
    //     }
    //   })
    // }
    this.answerHelper();
  }

  answerHelper() {
    const answerHover = this.hoverIndex;
    this.hoverIndex = 6;
    if (answerHover == 6) {
      console.log('error* answer = 6');
    }
    //first store qList in local, in case reload
    this.los.setLocalData('qList', this.qList);
    var currentItem = this.qList.shift();//pop the very first item of the list
    // var currentItem = this.currentTermItem;

    if (currentItem.repeatTime == -1) {//first time answering a new item
      currentItem.q = answerHover;//first store the quality of response

      //if this item belongs a previous progress, also update its EF
      if (currentItem.n != 0) {
        currentItem.EF = this.efCalculator(currentItem.EF, currentItem.q);
      }

      if (this.qualityCheck(answerHover) == 'g') {//quality easy
        //remove and store directly
        this.urs.storeLocalInfo(currentItem);
      } else {
        currentItem.repeatTime = 3;//repeat it for three times
        this.insertItem(currentItem);
      }
    } else {//second or more time answering
      if (this.qualityCheck(answerHover) == 'p') {
        currentItem.repeatTime = 3;
        this.insertItem(currentItem);
      } else if (this.qualityCheck(answerHover) == 'm') {
        this.insertItem(currentItem);
      } else {
        if (currentItem.repeatTime == 1) {
          //store the item in local storage
          this.urs.storeLocalInfo(currentItem);
        } else {
          // console.log('respond good quality, minus repeat time by 1')
          const repeatTime = currentItem.repeatTime;
          currentItem.repeatTime = repeatTime - 1;
          this.insertItem(currentItem);
        }
      }
    }

    //update question display
    this.slides.slideTo(0);
    this.updateQuestionDisplay();

    this.updateEnableDisplayAnswer();
    // this.qList.forEach(e => {//display all the items in the qList
    //   console.log(e);
    // });
    console.log(this.qList);
    console.log('----------');
    //reset input space
    this.userCode = '';
    this.userMulti = '';
    this.userAnswer = 3;
    this.updateQuestionProgress();

  }

  qualityCheck(answer: number) {
    //to do: update the check quality, so that it showes up in scale of 6
    //good medium poor
    if (answer >= 4) {
      return 'g';
    } else if (answer >= 2) {
      return 'm';
    } else {
      return 'p';
    }
  }

  efCalculator(EF, q) {
    //calculate the new value of the EF with previous EF and quality of response
    var EFp = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    EFp = Math.round(EFp * 100) / 100
    if (EFp < 1.3)
      return 1.3;
    else
      return EFp;
  }

  /*
  insert the current item into the list

  based on the length of the list
  if length greater than 20, insert item into 1/4
  if length greater than 10, insert item into 1/2
  otherwise, insert item into end
  */
  insertItem(item) {
    if (this.qList.length > 20)
      this.qList.splice(Math.round(this.qList.length / 4), 0, item);
    else if (this.qList.length > 10)
      this.qList.splice(Math.round(this.qList.length / 2), 0, item);
    else
      this.qList.splice(this.qList.length, 0, item);
  }

  displayLocalStorage() {
    // console.log(this.los.fetchLocalData('qList'));
    console.log(localStorage);

    // console.log(this.qList);
  }

  displayLocalProgress() {
    console.log(this.los.fetchLocalData('answerProgress'));
  }

  displayLocalCompleted() {
    console.log(this.los.fetchLocalData('answerQuestion'));
  }

  currentTermItemDisplay() {
    console.log(this.currentTermItem);
  }

  clearCache() {
    localStorage.clear();
    // this.los.setLocalData('previousProgress', null);
  }


  slideOpts = {
    on: {
      beforeInit() {
        const swiper = this;
        swiper.classNames.push(`${swiper.params.containerModifierClass}flip`);
        swiper.classNames.push(`${swiper.params.containerModifierClass}3d`);
        const overwriteParams = {
          slidesPerView: 1,
          slidesPerColumn: 1,
          slidesPerGroup: 1,
          watchSlidesProgress: true,
          spaceBetween: 0,
          virtualTranslate: true,
        };
        swiper.params = Object.assign(swiper.params, overwriteParams);
        swiper.originalParams = Object.assign(swiper.originalParams, overwriteParams);
      },
      setTranslate() {
        const swiper = this;
        const { $, slides, rtlTranslate: rtl } = swiper;
        for (let i = 0; i < slides.length; i += 1) {
          const $slideEl = slides.eq(i);
          let progress = $slideEl[0].progress;
          if (swiper.params.flipEffect.limitRotation) {
            progress = Math.max(Math.min($slideEl[0].progress, 1), -1);
          }
          const offset$$1 = $slideEl[0].swiperSlideOffset;
          const rotate = -180 * progress;
          let rotateY = rotate;
          let rotateX = 0;
          let tx = -offset$$1;
          let ty = 0;
          if (!swiper.isHorizontal()) {
            ty = tx;
            tx = 0;
            rotateX = -rotateY;
            rotateY = 0;
          } else if (rtl) {
            rotateY = -rotateY;
          }

          $slideEl[0].style.zIndex = -Math.abs(Math.round(progress)) + slides.length;

          if (swiper.params.flipEffect.slideShadows) {
            // Set shadows
            let shadowBefore = swiper.isHorizontal() ? $slideEl.find('.swiper-slide-shadow-left') : $slideEl.find('.swiper-slide-shadow-top');
            let shadowAfter = swiper.isHorizontal() ? $slideEl.find('.swiper-slide-shadow-right') : $slideEl.find('.swiper-slide-shadow-bottom');
            if (shadowBefore.length === 0) {
              shadowBefore = swiper.$(`<div class="swiper-slide-shadow-${swiper.isHorizontal() ? 'left' : 'top'}"></div>`);
              $slideEl.append(shadowBefore);
            }
            if (shadowAfter.length === 0) {
              shadowAfter = swiper.$(`<div class="swiper-slide-shadow-${swiper.isHorizontal() ? 'right' : 'bottom'}"></div>`);
              $slideEl.append(shadowAfter);
            }
            if (shadowBefore.length) shadowBefore[0].style.opacity = Math.max(-progress, 0);
            if (shadowAfter.length) shadowAfter[0].style.opacity = Math.max(progress, 0);
          }
          $slideEl
            .transform(`translate3d(${tx}px, ${ty}px, 0px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        }
      },
      setTransition(duration) {
        const swiper = this;
        const { slides, activeIndex, $wrapperEl } = swiper;
        slides
          .transition(duration)
          .find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left')
          .transition(duration);
        if (swiper.params.virtualTranslate && duration !== 0) {
          let eventTriggered = false;
          // eslint-disable-next-line
          slides.eq(activeIndex).transitionEnd(function onTransitionEnd() {
            if (eventTriggered) return;
            if (!swiper || swiper.destroyed) return;

            eventTriggered = true;
            swiper.animating = false;
            const triggerEvents = ['webkitTransitionEnd', 'transitionend'];
            for (let i = 0; i < triggerEvents.length; i += 1) {
              $wrapperEl.trigger(triggerEvents[i]);
            }
          });
        }
      }
    }
  };
}
