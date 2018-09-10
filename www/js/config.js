/*
 *  This file is part of CashReg.
 *
 *  CashReg is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CashReg is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with CashReg.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Copyright (c) 2018 cashreg.org
 */

/*
 *
 * cashreg (example/default) configuration
 *
 * author: frank@cashreg.org
 *
 */

// --- general settings ---

/* colors */
var DEFEMPHCOL="yellow";
var DEFGOCOL="lime";

/* products dialog */
var CGRPTITLE="Anzahl und Gruppe w&auml;hlen";
var CAMOUNT=6;
var OPTIONSTITLE="Optionen";

/* bon and accounting configuration */
var RNAME="Cafe Foobar";
var STREET="Augsburgerstr. 2";
var CITY="86150 Augsburg";
var TEL="Tel: 0821 / 123456";
var TID="UStID:  123/456/78901";
var BONHEAD="<div class=head2>"+
            "<img src=./img/logo.png width=100%><br>"+
            "</div>"+
            "<div class=head2>"+
            STREET+"<br>"+
            CITY+"<br>"+
            TEL+"<br>"+
            TID+"<br><br>"+
            "</div>";
var DISCOUNT="Rabatt";
var TAX="MwSt";
var TAXOFF="davon";
var PRODUCT="Produkt";
var NEW="Neu";
var CURRENCY="Euro";
var CITEM="&euro;";
var TOTAL="Ges:";
var RECEIPT="Beleg";
// x/z bon
var BUFVAL=0;
var RUNTOT="Kassenstand";
var SALES="Umsatz"
var SAVINGS="Betrag Bankeinzahlung";
var ZBONBTN="Complete the day ...";
var ZBONMODAL="Wait a moment! Are you absolutely sure?";
var ZBONACK="Yes, I'll take responsability!";
var ZBONNACK="Stop! Get me out of here ...";
var XBONBTN="The day so far ...";

// Tabs
var TABLES="Tische";
var ORDERS="Bestellungen";
var PAY="Bezahlen";
var TABLES_ADMINMODE="Tische";
var ORDERS_ADMINMODE="Kategorien / Produkte";
var PAY_ADMINMODE="Konfiguration / X und Z Bons";

// epos
var PCHARS=36;
var CCHARS=7;
var TDIND=4;
var TSEP=12;

var DRAWERNUM="1";

/* numpad IO */
var INSERT="Einlage";
var DRAW="Entnahme";
var MANUAL_INPUT="Manuelle Eingabe"

/* bill */
var PAYBILL="&euro; / &cent;";

/* noncash  */
// 1: vouchers
var PAYVOUCH="&spades;<br>&clubs; G &hearts;<br>&diams;";
var VOUCHAMOUNT="Einzul&ouml;sender Gutscheinwert"
var VPAY="OK!";
var VCANCEL="Abbruch";
/* noncash index to zbon text mapping */
var NONCASH={
	"1": "Gutschein Einl&ouml;sungen"
};

/* orders */
var SHOWALL="Alle Tische";
var SHOWSEL="Sel. Tisch";
//var STATEIP="&hearts;"
var STATEIP="&#9992;"
var STATEFIN="&#10003;"
var SHOWSTATEALL="Alle "+STATEIP+" / "+STATEFIN;
var SHOWSTATEYES="Serviert "+STATEFIN;
var SHOWSTATENO="in Arbeit "+STATEIP;
var MOVETABLE="Umzug";
var PAYTABLE="Tisch &#10143;";

/* map */
var CTABLETITLE="Tisch w&auml;hlen";

/* group */
var CGROUPTITLE="Gruppe w&auml;hlen";

/* edit categories and products */
var PEDIT="Produkt editieren";
var CEDIT="Kategorie editieren";
var EDEL="Entfernen";
var ESAVE="Speichern";
var ECANCEL="Abbrechen";

// --- content data configuration ---

var config = {};

/*
 * products
 */

config.products = [
	{
		category: "Essen",
		items:
			[
				{
					'name': "Gulaschsuppe",
					'brutto': 6.5,
					'group': [1,2,3]
				},
				{
					'name': "K&auml;sesp&auml;tzle",
					'brutto': 8.5,
					'group': [1,2,3]
				},
			]
	},
	{
		category: "Kaltgetr&auml;nke",
		items:
			[
				{
					'name': "Saftschorle gro&szlig;",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Kinderschorle",
					'brutto': 1.0,
					'group': [1,2,3]
				},
				{
					'name': "Saftschorle klein",
					'brutto': 2.2,
					'group': [1,2,3]
				},
				{
					'name': "Wei&szlig;bier",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Radler",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Helles",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Glas Wein",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Sekt 0,1l",
					'brutto': 3.4,
					'group': [1,2,3]
				},
				{
					'name': "Saft pur 0,2l",
					'brutto': 2.5,
					'group': [1,2,3]
				},
				{
					'name': "Wasser gro&szlig;",
					'brutto': 2.2,
					'group': [1,2,3]
				},
				{
					'name': "Wasser klein",
					'brutto': 1.8,
					'group': [1,2,3]
				},
				{
					'name': "Flasche Wasser",
					'brutto': 3.5,
					'group': [1,2,3]
				},
				{
					'name': "Sekt 0,7l",
					'brutto': 21.9,
					'group': [1,2,3]
				},
				{
					'name': "Karaffe Wein 0,25l",
					'brutto': 5.8,
					'group': [1,2,3]
				},
				{
					'name': "Karaffe Wein 0,5l",
					'brutto': 11.6,
					'group': [1,2,3]
				},
				{
					'name': "Weinschorle 0,3l",
					'brutto': 3.9,
					'group': [1,2,3]
				},
				{
					'name': "Schnaps/Lik&ouml;r",
					'brutto': 2.9,
					'group': [1,2,3]
				},
				{
					'name': "Gin Tonic 0,3l",
					'brutto': 6.5,
					'group': [1,2,3]
				}
			]
	},
	{
		category: "Kuchen",
		items:
			[
				{
					'name': "Streuselkuchen",
					'brutto': 2.6,
					'group': [1,2,3]
				}
			]
	},
	{
		category: "Heissgetr&auml;nke",
		items:
			[
				{
					'name': "Cappuccino",
					'brutto': 3.0,
					'group': [1,2,3]
				},
				{
					'name': "Gro&szlig;er Cappuccino",
					'brutto': 3.5,
					'group': [1,2,3]
				},
				{
					'name': "Tasse Kaffee",
					'brutto': 2.5,
					'group': [1,2,3]
				},
				{
					'name': "Tasse Tee",
					'brutto': 2.4,
					'group': [1,2,3]
				},
				{
					'name': "Espresso",
					'brutto': 2.0,
					'group': [1,2,3],
				}
			]
	}
];

/*
 * groups
 */

config.groups = [
	{
		'name': 'Cafe 19%',
		'tax': 19,
		'discount': 0,
		'active': true,
		'ours': 1
	},
	{
		'name': 'Cafe  7%',
		'tax': 7,
		'discount': 0,
		'active': true,
		'ours': 1
	},
	{
		'name': 'Personal 19%',
		'tax': 19,
		'discount': 20,
		'active': true,
		'ours': 1
	},
	{
		'name': 'Personal  7%',
		'tax': 7,
		'discount': 20,
		'active': true,
		'ours': 1
	},
	{
		'name': 'Personal @ Work',
		'tax': 19,
		'discount': 0,
		'active': true,
		'ours': -1
	},
	{
		'name': 'Bruch',
		'tax': 19,
		'discount': 0,
		'active': true,
		'ours': -1
	},
	{
		'name': 'Gutscheine',
		'tax': 0,
		'discount': 0,
		'active': false,
		'ours': 1
	}
];

/*
 * map
 */

config.map = [
	{
		default_table: 13,
		table:
		// row	//col
		[
			[-1,4,3,0,2,1,-1,0,-2,-2,-2,-2],
			[-1,0,0,0,0,0,0,0,-2,-2,-2,-2],
			[-1,0,6,0,5,0,-1,0,-2,-2,-2,-2],
			[0,0,-1,-1,-1,-1,-1,0,14,0,0,15],
			[0,0,0,0,0,0,0,0,0,0,0,0],
			[0,0,-1,-1,-1,-1,-1,0,0,0,18,0],
			[0,0,0,9,8,7,-1,0,16,17,0,0],
			[0,0,0,0,0,0,0,0,0,0,0,20],
			[13,13,-1,0,10,10,-1,0,19,19,0,0],
			[0,0,0,0,-1,-1,-1,0,0,0,0,0],
			[0,0,-1,0,11,-1,0,0,-1,-1,-1,-1],
			[0,0,-1,12,0,-1,0,0,-1,-1,-1,-1]
		],
		selected_table_col: DEFEMPHCOL,
		table_color: [
			"notused",
			"red",
			"green",
			"blue",
			"purple",
			"grey",
			"yellow",
			"red",
			"green",
			"blue",
			"purple",
			"grey",
			"red",
			"green",
			"red",
			"green",
			"blue",
			"purple",
			"grey",
			"yellow",
			"red"
		]
	}
];

/*
 * dbsync
 */

config.dbsync = [
	{
		'host': "10.8.0.1",
		'port': "5984",
		'prefix': "changeme",
		'type': "couchdb"
	}
];

/*
 * config
 */

config.config = [
	{
		'name': RNAME,
		'street': STREET,
		'city': CITY,
		'tel': TEL,
		'tid': TID,
		'currency': CURRENCY,
		'bufval': BUFVAL
	}
];

