import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { Customer } from "../core/models/customer";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { map, tap, catchError } from "rxjs";

export interface PagedResult<T> {
    data: T[];
    total: number;
}

interface CustomerListResponse {
    customers: Customer[];
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
    private readonly baseUrl = `${environment.apiUrl}/customers`;
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
    

    getPage(pageIndex: number, pageSize: number): Observable<PagedResult<Customer>> {
        return this.ensureLoaded().pipe(
            map(() => {
                const start = (pageIndex - 1) * pageSize;
                const pageData = this.customers.slice(start, start + pageSize);
                return { data: pageData, total: this.customers.length };
            })
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

}