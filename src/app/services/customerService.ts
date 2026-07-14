import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { Customer } from "../core/models/customer";

export interface PagedResult<T> {
    data: T[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})

export class CustomerService {
    private customers: Customer[] = [
        { id: 1, customerCode: 'KH001', customerName: 'Nguyễn Văn A', age: 25, address: 'Hà Nội' },
        { id: 2, customerCode: 'KH002', customerName: 'Trần Thị B', age: 30, address: 'Đà Nẵng' },
        { id: 3, customerCode: 'KH003', customerName: 'Lê Văn C', age: 22, address: 'TP.HCM' },
        { id: 4, customerCode: 'KH004', customerName: 'Lê Văn D', age: 28, address: 'Hà Nội' },
        { id: 5, customerCode: 'KH005', customerName: 'Lê Văn E', age: 36, address: 'Hà Nội' },
        { id: 6, customerCode: 'KH006', customerName: 'Lê Văn F', age: 52, address: 'Đà Nẵng' },
        { id: 7, customerCode: 'KH007', customerName: 'Lê Văn G', age: 45, address: 'TP.HCM' },
        { id: 8, customerCode: 'KH008', customerName: 'Lê Văn H', age: 18, address: 'Đà Nẵng' },
    ];

    private customer$ = new BehaviorSubject<Customer[]>(this.customers);

    getPage(pageIndex: number, pageSize: number): Observable<PagedResult<Customer>> {
        const start = (pageIndex - 1) * pageSize;
        const pageData = this.customers.slice(start, start + pageSize);
        return of({ data: pageData, total: this.customers.length });
    }

    checkCodeExists(code: string, excludeId?: number): Observable<boolean> {
        const exists = this.customers.some(c => c.customerCode === code && c.id !== excludeId);
        return of(exists);
    }

    add(customer: Omit<Customer, 'id'>): Observable<Customer> {
        const newId = Math.max(0, ...this.customers.map(c => c.id)) + 1;
        const newCustomer: Customer = { ...customer, id: newId };
        this.customers = [...this.customers, newCustomer];
        this.customer$.next(this.customers);
        return of(newCustomer);
    }

    update(customer: Customer): Observable<Customer> {
        this.customers = this.customers.map(c => c.id === customer.id ? customer : c);
        this.customer$.next(this.customers);
        return of(customer);
    }

    delete(id: number): Observable<boolean> {
        this.customers = this.customers.filter(c => c.id !== id);
        this.customer$.next(this.customers);
        return of(true);
    }

    getById(id: number): Observable<Customer | undefined> {
        return of(this.customers.find(c => c.id === id));
    }

}