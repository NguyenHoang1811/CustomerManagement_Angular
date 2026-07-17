import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { Customer } from "../core/models/customer";
import { HttpClient } from "@angular/common/http";
import { map, tap, catchError } from "rxjs";
import { removeVietnameseTones } from "../core/ulits/string";
import { COMMNUES } from "../core/data/communes";
import { PROVINCES } from "../core/data/provinces";

export interface PagedResult<T> {
    data: T[];
    total: number;
}

interface CustomerListResponse {
    customers: Customer[];
}

export interface CustomerFilter {
    keyword?: string;
    provinceCode?: string | null;
    communeCode?: string | null;
    ageFrom?: number | null;
    ageTo?: number | null;
}

export interface ImportRowResult {
    rowIndex: number;
    data: Partial<Customer>;
    raw: {
        provinceName: string;
        communeName: string;
    };
    valid: boolean;
    reasons: string[];
}
@Injectable({
    providedIn: 'root'
})

export class CustomerService {
    // private customers: Customer[] = [
    //     { id: 1, customerCode: 'KH001', customerName: 'Nguyễn Văn A', age: 25, address: 'Hà Nội' },
    //     { id: 2, customerCode: 'KH002', customerName: 'Trần Thị B', age: 30, address: 'Đà Nẵng' },
    //     { id: 3, customerCode: 'KH003', customerName: 'Lê Văn C', age: 22, address: 'TP.HCM' },
    //     { id: 4, customerCode: 'KH004', customerName: 'Lê Văn D', age: 28, address: 'Hà Nội' },
    //     { id: 5, customerCode: 'KH005', customerName: 'Lê Văn E', age: 36, address: 'Hà Nội' },
    //     { id: 6, customerCode: 'KH006', customerName: 'Lê Văn F', age: 52, address: 'Đà Nẵng' },
    //     { id: 7, customerCode: 'KH007', customerName: 'Lê Văn G', age: 45, address: 'TP.HCM' },
    //     { id: 8, customerCode: 'KH008', customerName: 'Lê Văn H', age: 18, address: 'Đà Nẵng' },
    // ];
    private readonly baseUrl = `https://8479a56e-5cfb-439c-a7c0-0618fc41109c.mock.pstmn.io/customers`;
    private customers: Customer[] = [];
    // private customer$ = new BehaviorSubject<Customer[]>(this.customers);
    private load = false;

    constructor(private http: HttpClient) { }

    private ensureLoaded(): Observable<Customer[]> {
        if (this.load) {
            return of(this.customers);
        }
        return this.http.get<CustomerListResponse>(this.baseUrl).pipe(
            map(res => res.customers),
            tap(list => {
                this.customers = list;
                // this.customer$.next(this.customers);
                this.load = true;
            })
        );
    }

    private applyFilter(customers: Customer[], filter?: CustomerFilter): Customer[] {
        if (!filter) return customers;

        let result = customers;
        const keyword = removeVietnameseTones(filter.keyword ?? '');
        if (keyword) {
            result = result.filter(c =>
                removeVietnameseTones(c.customerCode).includes(keyword) ||
                removeVietnameseTones(c.customerName).includes(keyword)
            );
        }

        if (filter.provinceCode) {
            result = result.filter(c => c.provinceCode === filter.provinceCode);
        }

        if (filter.communeCode) {
            result = result.filter(c => c.communeCode === filter.communeCode);
        }

        if (filter.ageFrom != null) {
            result = result.filter(c => c.age >= filter.ageFrom!);
        }
        if (filter.ageTo != null) {
            result = result.filter(c => c.age <= filter.ageTo!);
        }
        return result;
    }

    getPage(pageIndex: number, pageSize: number, filter?: CustomerFilter): Observable<PagedResult<Customer>> {
        return this.ensureLoaded().pipe(
            map(() => {
                const filtered = this.applyFilter(this.customers, filter);
                const start = (pageIndex - 1) * pageSize;
                const pageData = filtered.slice(start, start + pageSize);
                return { data: pageData, total: filtered.length };
            })
        );
    }


    search(filter?: CustomerFilter): Observable<Customer[]> {
        return this.ensureLoaded().pipe(
            map(() => this.applyFilter(this.customers, filter))
        );
    }

    checkCodeExists(code: string, excludeId?: number): Observable<boolean> {
        return this.ensureLoaded().pipe(
            map(() => this.customers.some(c => c.customerCode === code && c.id !== excludeId))
        );
    }

    add(customer: Omit<Customer, 'id'>): Observable<Customer> {
        return this.http.post<Customer>(this.baseUrl, customer).pipe(
            map(res => {
                const newId = Math.max(0, ...this.customers.map(c => c.id)) + 1;
                return { ...res, ...customer, id: newId } as Customer;
            }),
            tap(newCustomer => {
                this.customers = [...this.customers, newCustomer];
                // this.customer$.next(this.customers);
            })
        );
    }

    update(customer: Customer): Observable<Customer> {
        return this.http.put<Customer>(`${this.baseUrl}/${customer.id}`, customer).pipe(
            map(() => customer),
            tap(updated => {
                this.customers = this.customers.map(c => c.id === updated.id ? updated : c);
                // this.customer$.next(this.customers);
            })
        );
    }

    delete(id: number): Observable<boolean> {
        return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`).pipe(
            map(res => res.success),
            tap(success => {
                if (success) {
                    this.customers = this.customers.filter(c => c.id !== id);
                    // this.customer$.next(this.customers);
                }
            })
        );
    }

    getById(id: number): Observable<Customer | undefined> {
        const cached = this.customers.find(c => c.id === id);
        if (cached) {
            return of(cached);
        }
        return this.http.get<Customer>(`${this.baseUrl}/${id}`).pipe(
            catchError(() => of(undefined))
        );
    }


    // import excel
    validateImportRows(rawRows: any[]): Observable<ImportRowResult[]> {
        return this.ensureLoaded().pipe(
            map(() => this.doValidate(rawRows))
        );
    }

    private doValidate(rawRows: any[]): ImportRowResult[] {
        const results: ImportRowResult[] = [];
        const seenCodes = new Set<string>();
        const existingCodes = new Set(this.customers.map(c => c.customerCode.toLowerCase()));

        rawRows.forEach((row, index) => {
            const reasons: string[] = [];

            const customerCode = String(row['Mã khách hàng'] ?? '').trim();
            const customerName = String(row['Tên khách hàng'] ?? '').trim();
            const ageRaw = row['Tuổi'];
            const age = Number(ageRaw);
            const provinceName = String(row['Tỉnh/Thành'] ?? '').trim();
            const communeName = String(row['Xã/Phường'] ?? '').trim();
            const address = String(row['Địa chỉ'] ?? '').trim();

            if (!customerCode) {
                reasons.push('Thiếu mã khách hàng');
            } else {
                const codeLower = customerCode.toLowerCase();
                if (existingCodes.has(codeLower)) {
                    reasons.push('Mã khách hàng đã tồn tại trong hệ thống');
                } else if (seenCodes.has(codeLower)) {
                    reasons.push('Mã khách hàng bị trùng trong file import');
                } else {
                    seenCodes.add(codeLower);
                }
            }

            if (!customerName) reasons.push('Thiếu tên khách hàng');
            if (!ageRaw || isNaN(age)) {
                reasons.push('Tuổi phải là số');
            } else if (!Number.isInteger(age)) {
                reasons.push('Tuổi phải là số nguyên');
            } else if (age < 0 || age > 120) {
                reasons.push('Tuổi không hợp lệ (0-120)');
            }
            if (!address) reasons.push('Thiếu địa chỉ');

            const province = PROVINCES.find(
                p => removeVietnameseTones(p.name) === removeVietnameseTones(provinceName)
            );
            if (!provinceName) {
                reasons.push('Thiếu tỉnh/thành');
            } else if (!province) {
                reasons.push(`Tỉnh/thành "${provinceName}" không tồn tại`);
            }

            let commune;
            if (province) {
                commune = COMMNUES.find(
                    c => c.provinceCode === province.code &&
                        removeVietnameseTones(c.name) === removeVietnameseTones(communeName)
                );
                if (!communeName) {
                    reasons.push('Thiếu xã/phường');
                } else if (!commune) {
                    reasons.push(`Xã/phường "${communeName}" không thuộc "${provinceName}"`);
                }
            }

            results.push({
                rowIndex: index + 2,
                data: {
                    customerCode,
                    customerName,
                    age,
                    provinceCode: province?.code ?? '',
                    communeCode: commune?.code ?? '',
                    address,
                },
                raw: { provinceName, communeName },
                valid: reasons.length === 0,
                reasons,
            });
        });

        return results;
    }

}