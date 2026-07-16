import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { CustomerFormModalComponent } from '../customer-form-modal/customer-form-modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';
import { CustomerFormModalTemplate } from '../customer-form-modal-template/customer-form-modal-template';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, NzDividerModule, NzModalModule],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent implements OnInit {
  listOfData: Customer[] = [];
  total = 0;
  pageIndex = 1;
  pageSize = 5;
  loading = false;
  provinces = PROVINCES;

  constructor(
    private customerService: CustomerService,
    private modal: NzModalService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.customerService.getPage(this.pageIndex, this.pageSize).subscribe(res => {
      this.ngZone.run(() => {
        this.listOfData = res.data;
        this.total = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      });
    });
  }

  onPageIndexChange(index: number): void {
    this.pageIndex = index;
    this.loadData();
  }

  getProvinceName(code: string): string {
    return this.provinces.find(p => p.code === code)?.name ?? '';
  }

  getCommunedName(communeCode: string): string {
    return COMMNUES.find(c => c.code === communeCode)?.name ?? '';
  }

  openAddModal(): void {
    const modalRef = this.modal.create({
      nzTitle: 'Thêm khách hàng',
      nzContent: CustomerFormModalTemplate,
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
  exporting = false;

  exportToExcel(): void {
    this.exporting = true;

    this.customerService.getPage(1, Number.MAX_SAFE_INTEGER).subscribe(res => {
      const exportData = res.data.map(c => ({
        'Mã khách hàng': c.customerCode,
        'Tên khách hàng': c.customerName,
        'Tuổi': c.age,
        'Tỉnh/Thành': this.getProvinceName(c.provinceCode),
        'Xã/Phường': this.getCommunedName(c.communeCode),
        'Địa chỉ': c.address,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Khách hàng');


      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 8 },
        { wch: 15 },
        { wch: 20 },
        { wch: 30 },
      ];

      const fileName = `danh-sach-khach-hang_${this.formatDate(new Date())}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      this.exporting = false;
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  
}