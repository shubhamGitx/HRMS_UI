import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ProfileEntry } from './profile-entry';

describe('ProfileEntry', () => {
  let component: ProfileEntry;
  let fixture: ComponentFixture<ProfileEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileEntry],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEntry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

