import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'; // 👈 thêm
import { CommonModule } from '@angular/common';
import { CustomerService, CustomerFilter } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { CustomerFormModalComponent } from '../customer-form-modal/customer-form-modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';
import { CustomerFormModalTemplate } from '../customer-form-modal-template/customer-form-modal-template';
import { CustomerImportPreviewComponent } from '../customer-import-preview/customer-import-preview';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzTableModule, NzButtonModule,
    NzDividerModule, NzModalModule, NzInputModule, NzSelectModule,
    NzInputNumberModule, NzCheckboxModule, // 👈 thêm
  ],
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


  selectedIds = new Set<number>();
  deleting = false;

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

  onSearchEnter(): void {
    this.pageIndex = 1;
    this.loadData();
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


  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelect(id: number, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  get isAllSelectedOnPage(): boolean {
    return this.listOfData.length > 0 && this.listOfData.every(c => this.selectedIds.has(c.id));
  }

  get isIndeterminate(): boolean {
    const someSelected = this.listOfData.some(c => this.selectedIds.has(c.id));
    return someSelected && !this.isAllSelectedOnPage;
  }

  toggleSelectAllOnPage(checked: boolean): void {
    this.listOfData.forEach(c => {
      if (checked) {
        this.selectedIds.add(c.id);
      } else {
        this.selectedIds.delete(c.id);
      }
    });
  }

  bulkDelete(): void {
    if (this.selectedIds.size === 0) return;
    const ids = Array.from(this.selectedIds);

    this.modal.confirm({
      nzTitle: 'Xác nhận xoá nhiều',
      nzContent: `Bạn có chắc muốn xoá ${ids.length} khách hàng đã chọn?`,
      nzOkDanger: true,
      nzOnOk: () => {
        this.ngZone.run(() => {
          this.deleting = true;
          this.cdr.detectChanges();

          const deleteNext = (index: number): void => {
            if (index >= ids.length) {
              this.ngZone.run(() => {
                this.deleting = false;
                this.selectedIds.clear();
                this.loadData();
              });
              return;
            }
            this.customerService.delete(ids[index]).subscribe({
              next: () => deleteNext(index + 1),
              error: () => deleteNext(index + 1),
            });
          };
          deleteNext(0);
        });
      },
    });
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
        this.customerService.delete(customer.id).subscribe(() => {
          this.ngZone.run(() => {   // 👈 thêm
            this.loadData();
          });
        });
      },
    });
  }

  openImportModal(): void {
    const modalRef = this.modal.create({
      nzTitle: 'Nhập khách hàng từ Excel',
      nzContent: CustomerImportPreviewComponent,
      nzData: {},
      nzFooter: null,
      nzWidth: 900,
    });
    modalRef.afterClose.subscribe(result => {
      if (result === 'success') this.loadData();
    });
  }

  exporting = false;

  exportToExcel(): void {
    this.exporting = true;

    const buildAndDownload = (data: Customer[]): void => {
      const exportData = data.map(c => ({
        'Mã khách hàng': c.customerCode,
        'Tên khách hàng': c.customerName,
        'Tuổi': c.age,
        'Tỉnh/Thành': this.getProvinceName(c.provinceCode),
        'Xã/Phường': this.getCommunedName(c.communeCode),
        'Địa chỉ': c.address,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 30 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Khach hang');

      const wbout: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      this.downloadBlob(blob, `danh-sach-khach-hang_${this.formatDate(new Date())}.xlsx`);
      this.exporting = false;
    };

    if (this.selectedIds.size > 0) {
      // Có chọn -> chỉ xuất các dòng đang chọn
      this.customerService.getByIds(Array.from(this.selectedIds)).subscribe(buildAndDownload);
    } else {
      // Không chọn gì -> xuất theo bộ lọc hiện tại như trước
      const filter: CustomerFilter = {
        keyword: this.keyword,
        provinceCode: this.filterProvinceCode,
        communeCode: this.filterCommuneCode,
        ageFrom: this.ageFrom,
        ageTo: this.ageTo,
      };
      this.customerService.search(filter).subscribe(buildAndDownload);
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
}