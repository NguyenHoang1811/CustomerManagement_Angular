// customer-import-preview.ts
import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import * as XLSX from 'xlsx';
import { CustomerService, ImportRowResult } from '../../../services/customerService';
import { Customer } from '../../../core/models/customer';
import { PROVINCES } from '../../../core/data/provinces';
import { COMMNUES } from '../../../core/data/communes';

const REASON_TRUNCATE_LENGTH = 40;


@Component({
  selector: 'app-customer-import-preview',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzButtonModule, NzTagModule, NzTabsModule],
  templateUrl: './customer-import-preview.html',
})
export class CustomerImportPreviewComponent {
  fileName = '';
  results: ImportRowResult[] = [];
  validRows: ImportRowResult[] = [];
  invalidRows: ImportRowResult[] = [];

  reading = false;
  importing = false;
  hasReadFile = false;

  private selectedFile: File | null = null;

  constructor(
    private modalRef: NzModalRef,
    private customerService: CustomerService,
    private modal: NzModalService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.fileName = file.name;
    this.hasReadFile = false;
    this.results = [];
    this.validRows = [];
    this.invalidRows = [];
    input.value = '';
  }

  readFile(): void {
    if (!this.selectedFile) return;
    this.reading = true;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        this.customerService.validateImportRows(rawRows).subscribe({
          next: (results) => {
            this.ngZone.run(() => {              
              this.results = results;
              this.validRows = results.filter(r => r.valid);
              this.invalidRows = results.filter(r => !r.valid);
              this.hasReadFile = true;
              this.reading = false;
              this.cdr.detectChanges();           
            });
          },
          error: (err) => {
            this.ngZone.run(() => {
              console.error('validateImportRows error:', err);
              this.reading = false;
              this.cdr.detectChanges();
            });
          },
        });
      } catch (err) {
        this.ngZone.run(() => {
          console.error('Lỗi đọc file Excel:', err);
          this.reading = false;
          this.cdr.detectChanges();
        });
      }
    };

    reader.onerror = (err) => {
      this.ngZone.run(() => {
        console.error('FileReader error:', err);
        this.reading = false;
        this.cdr.detectChanges();
      });
    };

    reader.readAsArrayBuffer(this.selectedFile);
  }

  getProvinceName(code?: string): string {
    return PROVINCES.find(p => p.code === code)?.name ?? '';
  }

  getCommuneName(code?: string): string {
    return COMMNUES.find(c => c.code === code)?.name ?? '';
  }

  getProvinceDisplay(row: ImportRowResult): string {
    return this.getProvinceName(row.data.provinceCode) || row.raw.provinceName;
  }

  getCommuneDisplay(row: ImportRowResult): string {
    return this.getCommuneName(row.data.communeCode) || row.raw.communeName;
  }

  isReasonLong(row: ImportRowResult): boolean {
    return row.reasons.join('; ').length > REASON_TRUNCATE_LENGTH;
  }

  getReasonShort(row: ImportRowResult): string {
    const full = row.reasons.join('; ');
    return full.length > REASON_TRUNCATE_LENGTH ? full.slice(0, REASON_TRUNCATE_LENGTH) + '...' : full;
  }

  showReasonDetail(row: ImportRowResult): void {
    this.modal.info({
      nzTitle: `Lý do không hợp lệ - Dòng ${row.rowIndex}`,
      nzContent: row.reasons.map(r => `• ${r}`).join('<br/>'),
      nzOkText: 'Đóng',
    });
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
      'Mã khách hàng': r.data.customerCode || '',
      'Tên khách hàng': r.data.customerName || '',
      'Tuổi': Number.isFinite(r.data.age) ? r.data.age : '',
      'Tỉnh/Thành': this.getProvinceDisplay(r),
      'Xã/Phường': this.getCommuneDisplay(r),
      'Địa chỉ': r.data.address || '',
      'Lý do không hợp lệ': r.reasons.join('; '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 40 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Khong hop le');

    const wbout: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    this.downloadBlob(blob, 'khach-hang-loi-import.xlsx');
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

  close(): void {
    this.modalRef.close();
  }
}