import { Component, OnInit } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService,NzModalModule } from 'ng-zorro-antd/modal';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { CustomerFormModalComponent } from '../customer-form-modal/customer-form-modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';


@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, NzDividerModule ,NzModalModule],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent implements OnInit {
  listOfData: Customer[] = [];
  total = 0;
  pageIndex = 1;
  pageSize = 5;
  loading = false;

  constructor(
    private customerService: CustomerService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.customerService.getPage(this.pageIndex, this.pageSize).subscribe(res => {
      this.listOfData = res.data;
      this.total = res.total;
      this.loading = false;
    });
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.loadData(); 
  }

  openAddModal(): void {
    const modalRef = this.modal.create({
      nzTitle: 'Thêm khách hàng',
      nzContent: CustomerFormModalComponent,
      nzData: { mode: 'add' },
      nzFooter: null,
    });
    modalRef.afterClose.subscribe(result => {
      if (result === 'success') this.loadData();
    });
  }

  openEditModal(customer: Customer): void {
    const modalRef = this.modal.create({
      nzTitle: 'Sửa khách hàng',
      nzContent: CustomerFormModalComponent,
      nzData: { mode: 'edit', customer },
      nzFooter: null,
    });
    modalRef.afterClose.subscribe(result => {
      if (result === 'success') this.loadData();
    });
  }

  openViewModal(customer: Customer): void {
    this.modal.create({
      nzTitle: 'Chi tiết khách hàng',
      nzContent: CustomerFormModalComponent,
      nzData: { mode: 'view', customer },
      nzFooter: null,
    });
  }

  confirmDelete(customer: Customer): void {
    this.modal.confirm({
      nzTitle: 'Xác nhận xoá',
      nzContent: `Bạn có chắc muốn xoá khách hàng "${customer.customerName}"?`,
      nzOkDanger: true,
      nzOnOk: () => {
        this.customerService.delete(customer.id).subscribe(() => this.loadData());
      },
    });
  }
}