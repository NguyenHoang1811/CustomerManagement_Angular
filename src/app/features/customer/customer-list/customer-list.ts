import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { CommonModule } from '@angular/common';
import { CustomerFilter, CustomerService } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { CustomerFormModalComponent } from '../customer-form-modal/customer-form-modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';
import { CustomerFormModalTemplate } from '../customer-form-modal-template/customer-form-modal-template';
import * as XLSX from 'xlsx';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { debounceTime, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CustomerImportPreviewComponent } from '../customer-import-preview/customer-import-preview';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, NzDividerModule, NzModalModule, NzInputModule, NzSelectModule, NzInputNumberModule, FormsModule],
  templateUrl: './customer-list.html',
})

export class CustomerListComponent implements OnInit {
  listOfData: Customer[] = [];
  total = 0;
  pageIndex = 1;
  pageSize = 5;
  loading = false;
  provinces = PROVINCES;

  keyword = '';
  filterProvinceCode: string | null = null;
  filterCommuneCode: string | null = null;
  filterCommunes: typeof COMMNUES = [];
  ageFrom: number | null = null;
  ageTo: number | null = null;

  private searchSubject = new Subject<void>();

  constructor(
    private customerService: CustomerService,
    private modal: NzModalService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(400)).subscribe(() => {
      this.pageIndex = 1;
      this.loadData();
    });
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const filter: CustomerFilter = {
      keyword: this.keyword,
      provinceCode: this.filterProvinceCode,
      communeCode: this.filterCommuneCode,
      ageFrom: this.ageFrom,
      ageTo: this.ageTo,
    };
    this.customerService.getPage(this.pageIndex, this.pageSize, filter).subscribe(res => {
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

  onSearchChange(): void {
    this.searchSubject.next();
  }

  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadData();
  }

  onFilterProvinceChange(provinceCode: string | null): void {
    this.filterCommuneCode = null;
    this.filterCommunes = provinceCode ? COMMNUES.filter(c => c.provinceCode === provinceCode) : [];
    this.onFilterChange();
  }

  resetFilter(): void {
    this.keyword = '';
    this.filterProvinceCode = null;
    this.filterCommuneCode = null;
    this.filterCommunes = [];
    this.ageFrom = null;
    this.ageTo = null;
    this.onFilterChange();
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
    const filter: CustomerFilter = {
      keyword: this.keyword,
      provinceCode: this.filterProvinceCode,
      communeCode: this.filterCommuneCode,
      ageFrom: this.ageFrom,
      ageTo: this.ageTo,
    };

    this.customerService.search(filter).subscribe(data => {
      const exportData = data.map(c => ({
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
        { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 30 },
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

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      this.customerService.validateImportRows(rawRows).subscribe(results => {
        const modalRef = this.modal.create({
          nzTitle: 'Kết quả kiểm tra file import',
          nzContent: CustomerImportPreviewComponent,
          nzData: { results },
          nzFooter: null,
          nzWidth: 900,
        });
        modalRef.afterClose.subscribe(result => {
          if (result === 'success') this.loadData();
        });
      });
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }
}

