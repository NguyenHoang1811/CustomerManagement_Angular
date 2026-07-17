// customer-import-preview.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import * as XLSX from 'xlsx';
import { CustomerService, ImportRowResult } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';

@Component({
  selector: 'app-customer-import-preview',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, NzTagModule],
  templateUrl: './customer-import-preview.html',
})
export class CustomerImportPreviewComponent {
  results: ImportRowResult[];
  validRows: ImportRowResult[];
  invalidRows: ImportRowResult[];
  importing = false;

  constructor(
    private modalRef: NzModalRef,
    private customerService: CustomerService,
    @Inject(NZ_MODAL_DATA) public data: { results: ImportRowResult[] }
  ) {
    this.results = data.results;
    this.validRows = this.results.filter(r => r.valid);
    this.invalidRows = this.results.filter(r => !r.valid);
  }




  getProvinceName(code?: string): string {
    return PROVINCES.find(p => p.code === code)?.name ?? '';
  }

  getCommuneName(code?: string): string {
    return COMMNUES.find(c => c.code === code)?.name ?? '';
  }

  getProvinceDisplay(row: ImportRowResult): string {
    const matched = this.getProvinceName(row.data.provinceCode);
    return matched || row.raw.provinceName; 
  }

  getCommuneDisplay(row: ImportRowResult): string {
    const matched = this.getCommuneName(row.data.communeCode);
    return matched || row.raw.communeName;
  }

  importValidRows(): void {
    if (this.validRows.length === 0) return;
    this.importing = true;

    const importNext = (index: number): void => {
      if (index >= this.validRows.length) {
        this.importing = false;
        this.modalRef.close('success');
        return;
      }
      const row = this.validRows[index].data;
      this.customerService.add(row as Omit<Customer, 'id'>).subscribe({
        next: () => importNext(index + 1),
        error: () => importNext(index + 1), 
      });
    };
    importNext(0);
  }


  exportInvalidRows(): void {
    const exportData = this.invalidRows.map(r => ({
      'Mã khách hàng': r.data.customerCode,
      'Tên khách hàng': r.data.customerName,
      'Tuổi': Number.isFinite(r.data.age) ? r.data.age : '',
       'Tỉnh/Thành': this.getProvinceDisplay(r),   
    'Xã/Phường': this.getCommuneDisplay(r),
      'Địa chỉ': r.data.address,
      'Lý do không hợp lệ': r.reasons.join('; '), 
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 40 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Không hợp lệ');
    XLSX.writeFile(workbook, 'khach-hang-loi-import.xlsx');
  }

  close(): void {
    this.modalRef.close();
  }
}