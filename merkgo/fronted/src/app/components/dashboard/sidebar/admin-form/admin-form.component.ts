import { Component, OnInit, OnChanges, SimpleChanges } from "@angular/core";
// Services
import { ProductService } from "src/app/services/product.service";
// Models
import { Product } from "src/app/models/Product";
import { Category } from "src/app/models/Category";

@Component({
  selector: "app-admin-form",
  templateUrl: "./admin-form.component.html",
  styleUrls: ["./admin-form.component.css"]
})
export class AdminFormComponent implements OnInit, OnChanges {
  isHidden: boolean = true;
  isEmpty: boolean = false;
  isOK: boolean = false;
  warning: string = "";
  mode: string = "add";
  categories: Category[];
  currentProduct: Product = null;
  isFileSelected: boolean = false;
  selectedFile: any = null;
  initCategory: string = "Choose Category";
  isLoading: boolean = true;

  constructor(private productService: ProductService) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateCategories();
    if (this.mode == "add") {
      this.isHidden = false;
      this.onClearForm();
    }
  }

  ngOnInit() {
    this.productService.currentProduct.subscribe(product => {
      if (product) {
        this.currentProduct = product;
        this.mode = "edit";
        this.isHidden = false;
        this.isEmpty = false;
      }
    });
    this.updateCategories();
    if (this.categories !== undefined) this.initCategory = this.categories[0].cat_name;
    this.isLoading = false;
  }

  onFileSelected(event) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile)
      if (
        this.selectedFile.type !== "image/jpeg" &&
        this.selectedFile.type !== "image/jpg" &&
        this.selectedFile.type !== "image/png"
      ) {
        this.isFileSelected = true;
        this.isEmpty = true;
        this.isOK = false;
        this.warning = "File type is invalid";
      } else this.isEmpty = false;
  }

  onAddProduct() {
    this.isHidden = false;
    this.isOK = false;
    this.onClearForm();
  }

  onSaveNewProduct(form) {
    if (this.validateForm(form)) {
      this.isEmpty = false;
      let fd = new FormData();
      fd.append("prod_name", form.controls.prod_name.value);
      fd.append("price", form.controls.price.value);
      fd.append("category", form.controls.category.value);
      fd.append("imageUrl", this.selectedFile, this.selectedFile.name);
      this.isLoading = true;
      this.productService.createProduct(fd).subscribe(
        res => {
          this.isLoading = false;
          this.updateProducts();
          this.onClearForm();
          this.isOK = true;
          this.isEmpty = true;
          this.warning = "Producto Creado correctamente";
        },
        err => {
          this.isLoading = false;
          this.isEmpty = true;
          this.isOK = false;
          this.warning = "No se pudo crear el producto revise por favor los campos";
        }
      );
    } else {
      this.isOK = false;
      this.isEmpty = true;
    }
  }

  onUpdateProduct(form) {
    if (this.validateForm(form)) {
      this.isLoading = true;
      this.isOK = false;
      this.isEmpty = false;
      let fd = new FormData();
      if (this.selectedFile) fd.append("imageUrl", this.selectedFile, this.selectedFile.name);
      if (form.controls.price.value > 0) fd.append("price", form.controls.price.value);
      if (form.controls.prod_name.value && form.controls.prod_name.value.length > 1)
        fd.append("prod_name", form.controls.prod_name.value);
      if (form.controls.category.value && form.controls.category.value.length > 1)
        fd.append("category", form.controls.category.value);
      this.productService.editProduct(this.currentProduct.id, fd).subscribe(
        res => {
          this.isLoading = false;
          this.isEmpty = true;
          this.isOK = true;
          this.updateProducts();
          this.onClearForm();
          this.warning = "Producto Actualizado Correctamente";
        },
        err => {
          this.isLoading = false;
          this.isEmpty = true;
          this.isOK = false;
          this.warning = "No se ha podido actualizar el producto";
        }
      );
    } else this.isEmpty = true;
  }

  onDeleteProduct() {
    if (this.mode == "edit" && this.currentProduct) {
      this.isLoading = true;
      this.productService.deleteProduct(this.currentProduct.id).subscribe(
        res => {
          this.isLoading = false;
          this.updateProducts();
          this.isEmpty = true;
          this.isOK = true;
          this.warning = "Producto Borrado exitosamente";
        },
        err => {
          this.isLoading = false;
          this.isEmpty = true;
          this.isOK = false;
          this.warning = "No se pudo borrar el producto";
        }
      );
    }
    this.onClearForm();
  }

  onAddCategory(form) {
    if (form.valid) {
      this.isLoading = true;
      this.productService.createCategory({ cat_name: form.controls.category_add.value }).subscribe(
        res => {
          this.isLoading = false;
          this.updateCategories();
          if (this.categories !== undefined) this.initCategory = this.categories[0].cat_name;
          form.reset();
        },
        err => {
          this.isLoading = false;
          this.isEmpty = true;
          this.isOK = false;
          this.warning = "Could not create new category";
        }
      );
    }
  }

  onClearForm() {
    this.mode = "add";
    this.currentProduct = { id: "", prod_name: "", price: null, category: "", imageUrl: "" };
    this.selectedFile = null;
    this.isEmpty = false;
    this.isFileSelected = false;
  }

  validateForm(form) {
    let prod_name = form.controls.prod_name.value,
      price = form.controls.price.value,
      category = form.controls.category.value;

    if (this.mode == "add") {
      if (!this.selectedFile) {
        this.warning = "Por favor cargue una imagen";
        return false;
      }
      if (
        this.selectedFile.type !== "image/jpeg" &&
        this.selectedFile.type !== "image/jpg" &&
        this.selectedFile.type !== "image/png"
      ) {
        this.warning = "Tipo de formato incorrecto";
        return false;
      }
      if (form.pristine) {
        this.warning = "Por favor llene todos los campos requeridos";
        return false;
      }
      if (((prod_name && !prod_name.trim()) || (category && !category.trim()) || price) && form.pristine) {
        this.warning = "Por favor llene todos los campos requeridos";
        return false;
      }
      if (prod_name.length < 2 || form.controls.prod_name.pristine) {
        this.warning = "Nombre de producto con muy pocos caracteres";
        return false;
      }
      if (category.length < 2) {
        this.warning = "Nombre corto para categoria";
        return false;
      }
      if (category == "Choose Category") {
        this.warning = "Por favor escoja una categoria o crearla en la seccion de abajo";
        return false;
      }
      if (price == 0 || form.controls.price.pristine) {
        this.warning = "El precio del producto no puede ser 0";
        return false;
      }
    }

    if (this.mode == "edit") {
      if (this.selectedFile) {
        if (
          this.selectedFile.type !== "image/jpeg" &&
          this.selectedFile.type !== "image/jpg" &&
          this.selectedFile.type !== "image/png"
        ) {
          this.warning = "Tipo de imagen invalida";
          return false;
        }
      }
      if (!form.controls.prod_name.pristine && (prod_name && prod_name.trim()) && prod_name.length < 2) {
        this.warning = "Nombre de producto con muy pocos caracteres";
        return false;
      }
      if (!form.controls.category.pristine && (category && category.trim()) && category.length < 2) {
        this.warning = "Nombre corto para categoria";
        return false;
      }
      if (!form.controls.price.pristine && price !== null && price <= 0) {
        this.warning = "El precio del producto no puede ser 0";
        return false;
      }
    }
    return true;
  }

  updateProducts() {
    this.isLoading = true;
    this.productService.getAllProducts().subscribe(res => {
      this.isLoading = false;
      this.productService.displayedProducts(
        res.products.map(product => {
          return {
            id: product._id,
            prod_name: product.prod_name,
            price: product.price,
            imageUrl: product.imageUrl,
            category: product.category.cat_name
          };
        })
      );
    });
  }

  updateCategories() {
    this.productService.getAllCategories().subscribe(res => {
      this.categories = res.categories.map(category => {
        return {
          id: category._id,
          cat_name: category.cat_name,
          products: category.products
        };
      });
      this.productService.displayedCategories(this.categories);
      this.categories.reverse();
    });
  }
}
