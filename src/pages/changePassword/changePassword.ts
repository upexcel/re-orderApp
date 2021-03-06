import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators, ValidatorFn, AbstractControl} from '@angular/forms';
import {LoginProvider} from './../../providers/login/login';
import {ConsignmentProvider} from './../../providers/consignment/consignment';
import {ToastProvider} from './../../providers/toast/toast';

@Component({
    selector: 'page-home',
    templateUrl: 'changepassword.html'
})
export class ChangePassword implements OnInit {
    user: FormGroup;
    constructor(private _toast: ToastProvider, private _consignmentService: ConsignmentProvider, private _loginService: LoginProvider) {}

    ngOnInit() {
        this.user = new FormGroup({
            oldPassword: new FormControl('', [Validators.required]),
            password: new FormControl('', [Validators.required]),
            re_password: new FormControl('', [Validators.required, this.equalto('password')])
        });
    }

    equalto(field_name): ValidatorFn {
        return (control: AbstractControl): {[key: string]: any} => {

            let input = control.value;

            let isValid = control.root.value[field_name] == input
            if (!isValid)
                return {'equalTo': {isValid}}
            else
                return null;
        };
    }

    onSubmit(user) {
        let userData = this._consignmentService.getUserData()[0];
        this._consignmentService.checkUserType().then((loginWith) => {
            if (loginWith == "customer") {
                this._loginService.updatePassword("Customer_Table", user.value.oldPassword, userData.EmailAddress, user.value.re_password).then((res) => {
                    this._toast.presentToast("Password Change Successfully", 2000);
                }, (err) => {
                    this._toast.presentToast("Wrong Password", 2000);
                })
            } else {
                this._loginService.updatePassword("Contact_Table", user.value.oldPassword, userData.EmailAddress, user.value.re_password).then((res) => {
                    this._toast.presentToast("Password Change Successfully", 2000);
                }, (err) => {
                    this._toast.presentToast("Wrong Password", 2000);
                })
            }
        })
    }
}

