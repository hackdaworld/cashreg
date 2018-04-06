# CashReg

[CashReg](https://cashreg.org) aims to become a simple cash register (point of sales, POS) app primarily but not exclusively for gastronomy.

## How it all began and where it should go

There are lots of POS apps in the playstore.
So why the whole effort of creating yet another one?

At the time the project started, it looked like a new app which best meets the demands of a small gastronomy needs to be written from scratch.
In fact there was no suitable open source candidate available at that time.

Well, and now it's there, *CashReg*.
It's dirty. It's not comfortable over all. It lacks features.
Some parts even can't be configured within the app but must be changed in the source or by importing the respective configuration from an external database (originally intended for safety backups and analysis). 

Instead of painstakingly driving forward the project in private, it would be great to see *CashReg* evolving in whatever direction by the influence of the open source developer community. 
By going open source (it actually always was) and public (it's on github now) the quality and usability of *CashReg* might improve and new features and functionalities might arise.

## Important notes 
 
**Due to limited free time, I am cleaning and uploading the source step by step. Feel free to contact me if you can't wait to start hacking.**

This hint will be removed as soon as everything is in place and development can start.

### Disclaimer

**Although the app avoids abuse by design (i.e. every single transaction is stored and can't be deleted from within the app), there is no guarantee that the software (and hardware it is innstalled on) complies with the legal requirements of the respective authorities in your country.**

* Germany: [GoBD](https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Abgabenordnung/Datenzugriff_GDPdU/2014-11-14-GoBD.html) 
* ...

## Documentation / Usage

Look at the [./docs](./docs) directory for details.

## Install / Deploy

You can run *CashReg* 
* in your web browser hosting the app on a web server or
* as a native mobile [Cordova](http://cordova.apache.org/) app.

<!--
For first impressions, you can run the app in your browser using [this link](https://www.cashreg.org/app). Please note:
* do not use this link for production!
* a resolution equivalent to the one of common 10 inch tablets is required.
-->

### Using a web browser 

Clone this repository
```
git clone https://github.com/hackdaworld/cashreg.git
cd cashreg
```
 and copy over the `./www` directory to the document root location of you web server.

Alternatively, if you don't want to install and configure a web server, you can use the command line [node.js](http://nodejs.org/) http server.
After installing latest *node.js*, install and run the http-server
```
sudo npm install -g http-server
http-server www
```

Once yoour web server is running, visit the respective URL with your browser.

### Building Cordova platform apps

To build [Cordova](http://cordova.apache.org/) apps, you will need [node.js](https://nodejs.org/). After installing *node.js*, install *Cordova* using `npm`.
```
sudo npm install -g cordova
```

Clone this repository.
```
git clone https://github.com/hackdaworld/cashreg.git
```

This will create the directory `cashreg` containing the *CashReg* source along with the *Cordova* configuration. Change to this new directory.
```
cd cashreg
```

Depending on the platform you want to build your app for, you need to install [prerequisites](https://cordova.apache.org/docs/en/latest/guide/cli/#install-pre-requisites-for-building):
* [Android](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#requirements-and-support)
* [iOS](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html#requirements-and-support)

After that, add support for the respective platform, e.g. `android`.
```
cordova platform add android
```

*CashReg* can use features of some plugins which need to be added.
```
cordova plugin add cordova-plugin-webserver
cordova plugin add cordova-plugin-whitelist
```

Noy you can build
```
cordova build android
```
or build, upload and run
```
cordova run android
```
on the device connected to your computer.

### Printers

Using a web browser, you can use printers known by your printing subsystem and print a receipt as you would print any other document or website from the internet.

On mobile devices, *CashReg* can print receipts directly using Epson POS thermal printers. Please contact me or wait for updated documentation.

tbd

## Contribute

You are more than welcome, feel free to send pull requests!
 
