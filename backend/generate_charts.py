import sys
import json
import matplotlib.pyplot as plt
import numpy as np
import os

def generate_charts(data_json):
    data = json.loads(data_json)
    
    # Create directory if not exists
    output_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'charts')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 1. Volume Chart (Line)
    time_series = data.get('timeSeries', {})
    if time_series:
        days = sorted(time_series.keys())
        counts = [time_series[d] for d in days]
        day_labels = [d.split('-')[-1] for d in days]
        
        plt.figure(figsize=(10, 4))
        plt.plot(day_labels, counts, marker='o', color='#003366', linewidth=2)
        plt.fill_between(day_labels, counts, color='#003366', alpha=0.1)
        plt.title('Daily Complaint Volume', fontweight='bold')
        plt.xlabel('Day of Month')
        plt.ylabel('Count')
        plt.grid(True, linestyle='--', alpha=0.3)
        plt.savefig(os.path.join(output_dir, 'volume.png'), bbox_inches='tight', transparent=True)
        plt.close()

    # 2. Status Chart (Pie/Doughnut)
    status_data = data.get('byStatus', {})
    if status_data:
        labels = list(status_data.keys())
        sizes = list(status_data.values())
        colors = ['#856404', '#0c5460', '#155724', '#721c24'] # Match classic theme
        
        plt.figure(figsize=(6, 6))
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140, colors=colors[:len(labels)], wedgeprops={'width': 0.4})
        plt.title('Complaint Status Distribution', fontweight='bold')
        plt.savefig(os.path.join(output_dir, 'status.png'), bbox_inches='tight', transparent=True)
        plt.close()

    # 3. Department Chart (Bar)
    dept_data = data.get('byDepartment', {})
    if dept_data:
        depts = [d.split(' ')[0] for d in dept_data.keys()] # Shorten names
        counts = list(dept_data.values())
        
        plt.figure(figsize=(10, 5))
        plt.bar(depts, counts, color='#003366')
        plt.title('Complaints by Department', fontweight='bold')
        plt.ylabel('Count')
        plt.savefig(os.path.join(output_dir, 'dept.png'), bbox_inches='tight', transparent=True)
        plt.close()

    # 4. Zone Chart (Horizontal Bar or Polar)
    zone_data = data.get('byZone', {})
    if zone_data:
        zones = list(zone_data.keys())
        counts = list(zone_data.values())
        
        plt.figure(figsize=(8, 4))
        plt.barh(zones, counts, color='#FFD700') # Gold accent
        plt.title('Zonal Distribution', fontweight='bold')
        plt.xlabel('Count')
        plt.savefig(os.path.join(output_dir, 'zone.png'), bbox_inches='tight', transparent=True)
        plt.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_charts(sys.argv[1])
    else:
        print("No data provided")
