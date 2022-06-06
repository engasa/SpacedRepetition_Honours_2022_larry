import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(
    public loadingController: LoadingController,
    public alertController: AlertController,
  ) { }

  async displayMessage(inputMessage: string) {
    const alert2 = await this.alertController.create({
      cssClass: 'my-custom-class',
      message: inputMessage,
      buttons: ['OK']
    });
    await alert2.present();
  }
  async alertMessage(message) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      message: message,
      buttons: ['Ok']
    });
    await alert.present();
  }

  async presentChoice(choiceMessage: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      message: choiceMessage,
      buttons: ['Cancel', 'Yes']
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role != "cancel";
  }

}
