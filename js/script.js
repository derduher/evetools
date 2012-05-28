/* Author:
Patrick Weygand
*/

(function (){
	var UserProps = Backbone.Model.extend({
		defaults: {
			brokersFee: 0.0097,
			salesTax: 0.01
		}
	});
	var Item = Backbone.Model.extend({
		defaults: {
			'itemQuantity': 0,
			'marketValue': 0
		},
		calculate: function (brokersFee, tax) {
			var sub = this.get('itemQuantity') * this.get('marketValue'),
			brokersTotal = brokersFee * sub,
			totalTax = tax * sub;
			return {
				subTotal: sub,
				total: sub - brokersTotal - totalTax,
				brokersFee: brokersTotal,
				tax: totalTax
			};
		}
	});
	var Mineral = Backbone.Model.extend({
		defaults: {
			'quantity': 0
		},
		calculate: function (mineralValue, brokersFee, tax) {
			var sub = this.get('quantity') * mineralValue,
			brokersTotal = brokersFee * sub,
			totalTax = tax * sub;
			return {
				subTotal: sub,
				total: sub - brokersTotal - totalTax,
				brokersFee: brokersTotal,
				tax: totalTax
			};
		}

	});
	var Minerals = Backbone.Collection.extend({
		model: Mineral,
		comparator: function (mineral) {
			return mineral.id;
		},
		sum: function (index, brokersFee, tax) {
			return this.reduce(function (memo, mineral) {
				mineral = mineral.calculate(index.get(mineral.id), brokersFee, tax);
				memo.tax += mineral.tax;
				memo.brokersFee += mineral.brokersFee;
				memo.total += mineral.total;
				memo.subTotal += mineral.subTotal;
				return memo;
			}, {tax: 0, brokersFee: 0, total: 0, subTotal: 0});
		}
	});
	var MineralIndex = Backbone.Model.extend({
		defaults: {
			'tritanium': 4.5,
			'pyerite': 5,
			'mexallon': 30.38,
			'isogen': 59.96,
			'nocxium': 451.01,
			'zydrine': 775,
			'megacyte': 2720,
			'morphite': 3249.83
		}
	});
	var IskUnit = Backbone.Model.extend({
		defaults: {
			unit: 6
		},
		inUnit: function (amount) {
			return amount / Math.pow(10, this.get('unit'));
		},
		getLabel: function () {
			var label = {0:'', 3: 'K', 6: 'M', 9: 'B', 12: 'T'};
			if (this instanceof Number) {
				return label[this];
			} else {
				return label[this.get('unit')];
			}
		}
	});

	var BasicView = Backbone.View.extend({
		update: function (e){
			var blah = {};
			blah[e.target.id] = e.target.value;
			this.model.set(blah);
		},
		initialize: function (attributes) {
			_.bindAll(this, 'render');
			this.renderTmpl = Mustache.compile($(this.tmpl).text());
		}
	});
	var CalcsView = Backbone.View.extend({
		tagName: 'div',
		id: 'finalTotals',
		className: 'entryForm',
		tmpl: '#CalcsView',
		initialize: function () {
			_(this).bindAll('render');
			this.options.item.on('change', this.render);
			this.options.index.on('change', this.render);
			this.options.minerals.on('change', this.render);
			this.options.user.on('change', this.render);
			this.options.iskUnit.on('change', this.render);
			this.index = this.options.index;
			this.unit = this.options.iskUnit;
			this.useTmpl = Mustache.compile($(this.tmpl).text());
		},
		render: function () {
			var id,
			mineralTotals,
			itemTotals,
			rawVal = 0,
			marketVal = 0,
			unit = this.unit.get('unit'),
			brokersFee = this.options.user.get('brokersFee'),
			salesTax = this.options.user.get('salesTax');

			itemTotals = this.options.item.calculate(brokersFee, salesTax);
			marketVal = itemTotals.total;

			mineralTotals = this.options.minerals.sum(this.index, brokersFee, salesTax);
			rawVal = mineralTotals.total;

			marketVal = this.unit.inUnit(marketVal);
			rawVal = this.unit.inUnit(rawVal);

			this.$el.html(this.useTmpl({
				unit: this.unit.getLabel(),
				marketVal: accounting.formatNumber(marketVal, 3),
				rawVal: accounting.formatNumber(rawVal, 3)
			}));

			if (marketVal > rawVal) {
				id = 'marketTotal';
			} else {
				id = 'rawTotal';
			}

			$('#' + id, this.el).addClass('higherVal');
			return this;
		}
	});

	var EntryFormView = BasicView.extend({
		tagName: 'ul',
		className: 'entryForm',
		tmpl: '#EntryFormView'
	});

	var MineralCalculation = Backbone.View.extend({
		tagName: 'span',
		className: 'mineralCalculation',
		events: {
			mouseenter: 'showtip',
			mouseleave: 'killtip'
		},
		showtip: function (e) {
			this.tippy.css('display','inline-block');
			that = this;
			this.tippy.css('right','-' + that.tippy.innerWidth() + 'px');
			//setTimeout(function(){console.log(that.tippy.outerWidth());that.tippy.css('right','-' + that.tippy.outerWidth() + 'px');}, 30);
		},
		killtip: function (e) {
			this.tippy.hide();
		},
		initialize: function (attributes) {
			_.bindAll(this, 'render');
			this.renderTmpl = Mustache.compile($(this.tmpl).text());
			this.renderTip = Mustache.compile($(this.tipTmpl).text());
			this.model.on('change', this.render);
			this.options.userProps.on('change', this.render);
			this.options.index.on('change:' + this.model.id, this.render);
		},
		tmpl: '#MineralCalculation',
		tipTmpl: '#MineralCalculationTip',
		render: function () {
			var indexPrice = this.options.index.get(this.model.id),
			brokersFee = this.options.userProps.get('brokersFee'),
			tax = this.options.userProps.get('salesTax'),
			calculated = this.model.calculate(indexPrice, brokersFee, tax);

			this.$el.html(this.renderTmpl({
				calculated: accounting.formatNumber(calculated.total, 2)
			}));
			this.tippy = $(this.renderTip({
				subTotal: accounting.formatNumber(calculated.subTotal,2),
				tax: accounting.formatNumber(calculated.tax,2),
				brokersFee: accounting.formatNumber(calculated.brokersFee,2)
			}));
			this.tippy.hide();
			this.$el.append(this.tippy);
			return this;
		}
	});

	var MineralView = EntryFormView.extend({
		tagName: 'li',
		className: null,
		tmpl: '#MineralView',
		events: {
			'change input.mineral': 'update'
		},
		update: function (e) {
			this.model.set({quantity: e.target.value});
		},
		render: function () {
			this.$el.html(this.renderTmpl({
				id: this.model.id,
				val: this.model.get('quantity'),
				label: this.model.id
			}));
			var mineralCalculation = new MineralCalculation({id: this.model.id + "Calculation", model: this.model, index: this.options.index, userProps: this.options.userProps});
			this.$el.append(mineralCalculation.render().el);
			return this;
		}
	});

	var MineralsView = Backbone.View.extend({
		tagName: 'ul',
		render: function (){
			this.$el.empty();
			this.model.each(function (mineral) {
				mineralView = new MineralView({model: mineral, index: this.options.index, userProps: this.options.userProps});
				this.$el.append(mineralView.render().el);
			}, this);
			return this;
		}
	});
	var ItemView = EntryFormView.extend({
		id: 'itemInput',
		tmpl: '#ItemView',
		events: {
			'change input.item': 'update'
		},
		render: function () {
			this.$el.empty().html(this.renderTmpl({
				id: 'marketValue',
				label: 'worth',
				val: this.model.get('marketValue'),
				unit: 'ISK'
			}) + this.renderTmpl({
				id: 'itemQuantity',
				label: 'amount',
				val: this.model.get('itemQuantity'),
				unit: 'items'
			}));
			return this;
		}
	});
	var IskUnitView = BasicView.extend({
		tagName: 'select',
		id: 'unit',
		events: {
			'change': 'update'
		},
		tmpl: '#IskUnitView',
		render: function () {
			this.$el.empty();
			var unit = this.model.get('unit');

			this.$el.append(this.renderTmpl({
				units: [0,3,6,9,12],
				label: this.model.getLabel,
				selected: function () {
					if (this == unit) {
						return 'selected';
					}
				}
			}));

			return this;
		}
	});
	var UserPropsView = BasicView.extend({
		tagName: 'ul',
		events: {
			'change input': 'update'
		},
		tmpl: '#UserPropsView',
		render: function (){
			this.$el.empty();
			this.$el.html(this.renderTmpl({
				id: 'brokersFee',
				val: this.model.get('brokersFee'),
				label: 'Brokers Fee'
			}) + this.renderTmpl({
				id: 'salesTax',
				val: this.model.get('salesTax'),
				label: 'sales tax'
			}));
			return this;
		}
	});

	var EveTool = Backbone.Router.extend({
		routes: {
			'doIRefine': 'refine',
			'*any': 'refine',
			'': 'refine'
		},
		initialize: function (options) {
			this.minerals = new Minerals([
										{id: 'isogen'},
										{id: 'mexallon'},
										{id: 'nocxium'},
										{id: 'pyerite'},
										{id: 'tritanium'},
										{id: 'megacyte'},
										{id: 'morphite'},
										{id: 'zydrine'}
			]);
			this.item = new Item();
			this.mineralIndex = new MineralIndex();
			this.iskUnit = new IskUnit();
			this.user = new UserProps();
			this.itemView = new ItemView({model: this.item});
			this.mineralsView = new MineralsView({id: "mineralsInput", model: this.minerals, index: this.mineralIndex, userProps: this.user});
			this.userPropsView = new UserPropsView({id: "userPropsInput", model: this.user});
			this.iskUnitView = new IskUnitView({id: "unit", model: this.iskUnit});
			this.calcsView = new CalcsView({
				minerals: this.minerals,
				item: this.item,
				index: this.mineralIndex,
				user: this.user,
				iskUnit: this.iskUnit
			});
		},
		refine: function (options) {
			$('#main').empty()
			.append(this.calcsView.render().el)
			.append(this.userPropsView.render().el)
			.append(this.itemView.render().el)
			.append(this.mineralsView.render().el)
			.append(this.iskUnitView.render().el);
		}
	});
	window.app = new EveTool();
	Backbone.history.start({pushState: true});
})();



