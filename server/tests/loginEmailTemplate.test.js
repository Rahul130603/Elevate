import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { clientPortalUrl } from '../services/loginEmailTemplate.js';
import { loginEmailMessage } from '../services/loginEmail.js';

test('Branded email escapes account data and uses the correct India date and time', async () => {
  const previous = {url:process.env.APP_PUBLIC_URL, from:process.env.MAIL_FROM};
  try {
    process.env.APP_PUBLIC_URL = 'https://demo.example.com';
    process.env.MAIL_FROM = 'sender@example.com';
    const message = loginEmailMessage({name:'Rahul <img src=x onerror=alert(1)> & "Test"',recipient:'client@example.com',signed_in_at:'2026-10-05T18:45:00.000Z'});
    assert.ok(message.html.includes('6 October 2026'));
    assert.ok(message.html.includes('12:15 AM IST'));
    assert.ok(!message.html.includes('<img src=x'));
    assert.ok(message.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Test&quot;'));
    assert.ok(message.html.includes('https://demo.example.com/?mode=book'));
    assert.ok(message.text.includes('https://demo.example.com/?mode=book'));
    const transport = nodemailer.createTransport({streamTransport:true,buffer:true});
    const composed = (await transport.sendMail(message)).message.toString();
    assert.match(composed,/multipart\/alternative/);
    assert.match(composed,/multipart\/related/);
    assert.match(composed,/Content-ID: <elevate-login-logo>/);
    assert.match(composed,/Content-Type: image\/png/);
    assert.match(composed,/From: Elevate <sender@example.com>/);
  } finally {
    for (const [key,value] of [['APP_PUBLIC_URL',previous.url],['MAIL_FROM',previous.from]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('Email portal button rejects unsafe URL protocols', () => {
  const previous = process.env.APP_PUBLIC_URL;
  try {
    process.env.APP_PUBLIC_URL = 'javascript:alert(1)';
    assert.equal(clientPortalUrl(),'http://localhost:3000/?mode=book');
  } finally {
    if (previous === undefined) delete process.env.APP_PUBLIC_URL; else process.env.APP_PUBLIC_URL = previous;
  }
});
