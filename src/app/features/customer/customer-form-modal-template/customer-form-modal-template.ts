import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CustomerService } from '../../../services/customerService';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';
import { Commnune } from '../../../core/models/commune';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { Customer } from '../../../core/models/customer';

type ModalMode = 'add' | 'edit' | 'view';

@Component({
  selector: 'app-customer-form-modal-template',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule, NzSelectModule],
  templateUrl: './customer-form-modal-template.html'
})
export class CustomerFormModalTemplate implements OnInit {
  mode: ModalMode;
  customer?: Customer;
  submitting = false;
  codeExists = false;
  provinces = PROVINCES;
  communes: Commnune[] = [];

  model = {
    customerCode: '',
    customerName: '',
    age: null as number | null,
    provinceCode: null as string | null,
    communeCode: null as string | null,
    address: '',
  };


  constructor(
    private customerService: CustomerService,
    private modalRef: NzModalRef,
    @Inject(NZ_MODAL_DATA) public data: { mode: ModalMode; customer?: Customer }
  ) {
    this.mode = data.mode;
    this.customer = data.customer;
  }


  ngOnInit(): void {
    if (this.customer) {
      this.model = {
        customerCode: this.customer.customerCode,
        customerName: this.customer.customerName,
        age: this.customer.age,
        provinceCode: this.customer.provinceCode,
        communeCode: this.customer.communeCode,
        address: this.customer.address,
      };
      if (this.customer.provinceCode) {
        this.communes = COMMNUES.filter(c => c.provinceCode === this.customer!.provinceCode);
      }
    }
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  onProvinceChange(provinceCode: string): void {
    this.communes = COMMNUES.filter(c => c.provinceCode === provinceCode);
    this.model.communeCode = null;
  }

  onCodeBlur(): void {
    if (!this.model.customerCode) return;
    this.customerService.checkCodeExists(this.model.customerCode, this.customer?.id).subscribe(exists => {
      this.codeExists = exists;
    });
  }

  submit(form: NgForm): void {
    if (this.isViewMode) return;
    if (form.invalid || this.codeExists) {
      Object.values(form.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity(); 
      });
      return;
    }
    this.submitting = true;

    const request$ =
      this.mode === 'add'
        ? this.customerService.add(this.model as Omit<Customer, 'id'>)
        : this.customerService.update({ ...this.model, id: this.customer!.id } as Customer);

    request$.subscribe(() => {
      this.submitting = false;
      this.modalRef.close('success');
    });
  }

  close(): void {
    this.modalRef.close();
  }
}
