import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomerListComponent } from './features/customer/customer-list/customer-list';
import { Header } from './shared/layout/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerListComponent, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CustomerManagement_Angular');
}
