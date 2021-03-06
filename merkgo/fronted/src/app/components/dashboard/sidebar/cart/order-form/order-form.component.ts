import { Component, OnInit, Input } from "@angular/core";
import * as jsPDF from "jspdf";
// Services
import { OrderService } from "src/app/services/order.service";
import { AuthService } from "src/app/services/auth.service";
// Models
import { User } from "src/app/models/User";
import { Order } from "src/app/models/Order";

@Component({
  selector: "app-order-form",
  templateUrl: "./order-form.component.html",
  styleUrls: ["./order-form.component.css"]
})
export class OrderFormComponent implements OnInit {
  @Input() user: User;
  orders: Order[];
  count = 0;
  last = "";
  currentDate: string = "";
  cities: Array<String> = [
    "Bogota",
    "Zipaquira",
    "Tocancipa",
    "Chia",
    "Cota",
    "Sopo",
    "Cogua",
    "Choachi"
  ];
  isEmpty: boolean = false;
  warning: string = "";
  // modal & loading
  isLoading: boolean = true;
  display: string = "none";
  modalHeader: string = "";
  modalBody: string = "";

  constructor(private orderService: OrderService, private authService: AuthService) {}

  ngOnInit() {
    this.currentDate = this.getCurrentDate(new Date());
    this.isLoading = false;
  }

  onFinalizeOrder(form) {
    this.isEmpty = false;
    if (
      !form.valid ||
      !this.checkShipDate(form.controls.ship.value)
    ) {
      this.isEmpty = true;
      this.warning = "Por favor llene los campos requeridos";
      if (this.checkCreditCard(form.controls.credit.value))
        this.warning = "Numero de tarjeta ";
      if (!this.checkShipDate(form.controls.ship.value) && form.valid)
        this.warning = "La fecha de envío no es válida, debe ser la fecha actual o una fecha mayor";
      this.display = "none";
    } else {
      this.isLoading = true;
      this.orderService.getAllOrders().subscribe(
        res => {
          this.isLoading = false;
          // Booking validation
          let ship = form.controls.ship.value,
            takenDates = [],
            isTaken = false,
            orders = res.orders;
          if (orders) {
            const dates = orders.map(order => order.user.ship.toString().split("T")[0]);
            const allShipDates = dates.reduce((a, b) => {
              if (a.indexOf(b) < 0) a.push(b);
              return a;
            }, []);
            takenDates = allShipDates.filter(shipDate => dates.filter(date => date == shipDate).length > 2);
            if (takenDates.length > 0) isTaken = takenDates.filter(date => date === ship).length > 0;
            if (isTaken) {
              this.warning = `Envio en ${this.adjustDate(ship)} ya está reservado para 3 pedidos, elige otra fecha`;
              this.isEmpty = true;
              this.display = "none";
            } else
              this.orderService
                .addOrder(this.user,{
                  city: form.controls.city.value,
                  street: form.controls.street.value,
                  ship: form.controls.ship.value,
                  credit: form.controls.credit.value
                })
                .subscribe(
                  res => {
                    this.authService.userDetails(res.user);
                    this.authService.currentUserData.subscribe(
                      user => ((this.user = user), form.reset(), this.openModal()),
                      err => this.onError()
                    );
                  },
                  err => this.onError()
                );
          }
        },
        err => this.onError()
      );
    }
  }

  // download pdf receipt
  download() {
    this.isLoading = true;
    this.authService.currentUserOrdersData.subscribe(
      order => {
        this.isLoading = false;
        this.count++;
        if (order && this.count == 2 && this.last !== order._id) {
          this.last = order._id;
          let orderDates = `Fecha de Compra: ${this.adjustDate(
              this.getCurrentDate(order.user.order)
            )}\tfecha de envío: ${this.adjustDate(this.getCurrentDate(order.user.ship))}`,
            shipAddress = `Dirección de envio: ${order.user.street}, ${order.user.city}`,
            userInfo = `[ ID: ${this.user.cardId} ] ${this.user.fname} ${this.user.lname}`,
            itemsTXT = "";
          order.products.forEach(
            item =>
              (itemsTXT += `${item.prod_name}\tx ${item.quantity} units\ttotal:  ${item.prod_total.toFixed(2)} $\n\n`)
          );
          let doc = new jsPDF();
          doc.setFontSize(22);
          doc.setFontStyle("bold");
          doc.text("Gracias por comprar en Mark Go", 20, 20);
          doc.setLineWidth(0.5);
          doc.line(0, 25, 500, 25);
          doc.setFontSize(12);
          doc.setFontStyle("normal");
          doc.text("Order: " + order._id, 10, 35);
          doc.text(orderDates, 10, 45);
          doc.text(shipAddress, 10, 55);
          doc.text("Detalles de Cliente: " + userInfo, 10, 65);
          doc.line(0, 80, 500, 80);
          doc.setFontStyle("bold");
          doc.text("Total Valor: " + order.total.toFixed(2) + " ILS", 10, 90);
          doc.line(0, 95, 500, 95);
          doc.setFontStyle("normal");
          doc.text(itemsTXT, 10, 105);
          doc.save("receipt-" + this.user.fname + "-" + this.user.lname + "-" + order._id + ".pdf");
        }
      },
      err => this.onError()
    );
  }

  // modal
  openModal() {
    this.display = "block";
  }
  onCloseHandled() {
    this.display = "none";
  }
  // shipping date validation
  checkShipDate = ship => {
    let shipDate = new Date(ship).getTime(),
      orderDate = new Date(Date.now()).getTime();
    if (
      ship.match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/) &&
      (shipDate >= orderDate || ship === new Date().toISOString().split("T")[0])
    )
      return true;
    else return false;
  };
  getCurrentDate = date => {
    let today = new Date(date),
      current = today.getFullYear().toString();
    if (today.getMonth() + 1 < 10) current += "-0" + (today.getMonth() + 1);
    else current += "-" + (today.getMonth() + 1);
    if (today.getDate() < 10) current += "-0" + today.getDate();
    else current += "-" + today.getDate();
    return current;
  };
  adjustDate = date => {
    let correct = date.slice(-2) + "/" + date.slice(5, -3) + "/" + date.slice(0, 4);
    return correct;
  };
  // credit card validation
  checkCreditCard = (function(credit) {
    return function(ccNum) {
      var len = ccNum.length,
        bit = 1,
        sum = 0,
        val;
      while (len) {
        val = parseInt(ccNum.charAt(--len), 10);
        sum += (bit ^= 1) ? credit[val] : val;
      }
      return sum && sum % 10 === 0;
    };
  })([0, 2, 4, 6, 8, 1, 3, 5, 7, 9]);

  onError() {
    this.modalHeader = "Se produjo un error";
    this.modalBody = "No se pudo procesar su pedido debido a un problema de comunicación con el servidor. Por favor, inténtelo de nuevo más tarde.";
    this.openModal();
  }
}
