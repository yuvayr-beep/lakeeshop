<?php 
 include_once 'logincheck.php';
 // Constants
	// vobStatus - 0, Order Batch Upload cancelled
	// vobStatus - 1, Order Batch Upload processed and Assign pending
	// vobStatus - 2, Order Batch Upload under process
	// vobStatus - 3, Order Batch Stock fully assigned
	// vobStatus - 4, Order Batch Stock partially assigned
	// vobStatus2 - 5, Order Batch courier partially assigned
	// vobStatus2 - 6, Order Batch courier fully assigned

	// vorStatus - 0, Order failed validation
	// vorStatus - 1, Order passed validation
	// vorStatus - 2, Order stock assigned
	// vorStatus - 3, Order Courier Assigned
	// vorStatus - 4, Order Closed
	// vorStatus - 5, Package Closed
	// vorStatus - 6, Defective Return
	// vorStatus - 7, Damage Return

	// vmPreShipMode - 1 SYSTEM, 2 DP, 3 SURFACE

	// vcasStatus - 1, Courier Assigned
	// vcasStatus - 2, Courier Outscanned
	// vcasStatus - 3, Courier Returned
	// vcasStatus - 4, Courier Delivered
	// vcasStatus - 5, Delivery Returned
	// vcasStatus - 6, Sale Return
	// vcasStatus - 7, Courier Lost
	// vcasStatus - 8, AWB Assigned
	// vcasStatus - 9, Package closed
	// vcasStatus - 10, Courier Blocked
	// vcasStatus - 11, Defective Return
	// vcasStatus - 12, Damage Return
 // /Constants

include 'includes/Fns.php';

$sql="select * from vsproductbrand";
$result= $mysqli->query($sql);

if(!empty($_GET['Error'])){$err=$_GET['Error'];} else{ $err=""; }

if(!empty($_GET['Success'])){ $Succ=$_GET['Success']; } else { $Succ=""; }

if(!empty($_GET['FromDate']) && !empty($_GET['ToDate'])){
	$FromDate = date("Y-m-d 00:00:00",strtotime($_GET['FromDate']));
	$ToDate = date("Y-m-d 23:59:59",strtotime($_GET['ToDate']));
}else{	
    $FromDate = date("Y-m-d 00:00:00");
	$ToDate = date("Y-m-d 23:59:59");
}
 
$cltidCondition = '';
if (isset($_GET['cltid']) && !empty($_GET['cltid']) && $_GET['cltid'] != '0') {
    $cltidArray = array_map('intval', (array)$_GET['cltid']);
    $cltidCondition = " AND `vmcCltRefID` IN (" . implode(',', $cltidArray) . ")";
}

//$sql="SELECT * FROM `vsorderbatch` WHERE `vobStatus` IN ('1','4')".((isset($_GET['cltid']) && !($_GET['cltid'] == '0')) ? " AND `vmcCltRefID`='".$_GET['cltid']."'" : "")." AND `vobOrderDate` BETWEEN '".$FromDate."' AND '".$ToDate."' ORDER BY `vobBatchNo` ASC";
//die($sql);
$sql = "SELECT * FROM `vsorderbatch` 
        WHERE `vobStatus` IN ('1','4')" . 
        $cltidCondition . 
        " AND `vobOrderDate` BETWEEN '".$FromDate."' AND '".$ToDate."' 
        ORDER BY `vobBatchNo` ASC";
$result= $mysqli->query($sql);

$sql2 = "SELECT `vmcCltRefID` FROM `vsorderbatch` WHERE `vobStatus` IN ('1','4') GROUP BY `vmcCltRefID`";
$res2 = $mysqli->query($sql2);

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<title>Lakeeshop - Manage Master Stock Assignment</title>
	<meta name="description" content="Winkle is a Dashboard & Admin Site Responsive Template by hencework." />
	<meta name="keywords" content="admin, admin dashboard, admin template, cms, crm, Winkle Admin, Winkleadmin, premium admin templates, responsive admin, sass, panel, software, ui, visualization, web app, application" />
	<meta name="author" content="hencework"/>
	
	<!-- Favicon -->
	<link rel="shortcut icon" href="favicon.ico">
	<link rel="icon" href="favicon.ico" type="image/x-icon">
    
	<!-- Data table CSS -->
	<link href="../vendors/bower_components/datatables/media/css/jquery.dataTables.min.css" rel="stylesheet" type="text/css"/>
	
	<!-- Custom CSS -->
	<link href="dist/css/style.css" rel="stylesheet" type="text/css">
	<link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css" rel="stylesheet" />

</head>
<style>
	body {
	    color: #000000;
	    font-family: "Poppins", sans-serif;
	    font-size: 12px;
	    font-style: normal;
	    line-height: 1.5;
	    background: #192D46;
	    overflow-x: hidden;
	}
	.table > tbody > tr > td, .jsgrid-table > tbody > tr > td, .table > tbody > tr > th, .jsgrid-table > tbody > tr > th, .table > tfoot > tr > td, .jsgrid-table > tfoot > tr > td, .table > tfoot > tr > th, .jsgrid-table > tfoot > tr > th, .table > thead > tr > td, .jsgrid-table > thead > tr > td, .table > thead > tr > th, .jsgrid-table > thead > tr > th {
	    padding: 3px;
	    border-top: 2px solid #f5f5f5;
	    vertical-align: middle;
	}
	.pb-30 {
	    padding-bottom: 10px !important;
	}
	.btn.btn-circle, .fixed-sidebar-left .side-nav > li > a.btn-circle.documentation-btn, .wizard > .actions a.btn-circle, .dt-buttons .btn-circle.dt-button, .tablesaw-sortable th.tablesaw-sortable-head button.btn-circle, .sweet-alert button.btn-circle, .owl-theme .owl-nav .btn-circle[class*="owl-"], button.btn-circle.fc-agendaDay-button.fc-state-default.fc-corner-right, button.btn-circle.fc-month-button.fc-state-default.fc-corner-left, button.btn-circle.fc-agendaWeek-button, .btn-circle.fc-prev-button, .btn-circle.fc-next-button, .btn-circle.fc-today-button {
	    height: 32px;
	    width: 32px;
	    padding: 0;
	    border-radius: 50%;
	}
	.page-wrapper {
	    margin-left: 250px;
	    padding: 0px 20px;
	    position: relative;
	    background: #fff;
	    -webkit-transition: all 0.4s ease;
	    -moz-transition: all 0.4s ease;
	    transition: all 0.4s ease;
	    left: 0;
	}
	.select2-container {
        width: 100% !important;
    }
    .select2-selection--multiple {
        height: auto !important;
    }
    .select2-selection__choice {
        white-space: normal !important;
    }
    .select2-container--default .select2-selection--multiple .select2-selection__choice {
	    margin-bottom: 0px;
	    color: #000;
	}
</style>
<body>
	<!--Preloader-->
	<div class="preloader-it">
		<div class="la-anim-1"></div>
	</div>
	<!--/Preloader-->
    <div class="wrapper theme-1-active navbar-top-violet horizontal-nav">
		<!-- Top Menu Items -->
			<?php include 'widget/header.php'; ?>
			<!-- /Top Menu Items -->
		<!-- Main Content -->
		<div class="page-wrapper">
			<div class="container-fluid">
			</div>
			<!-- /Title -->
			<!-- Row -->
			<div class="row" style="padding-top:10px;">
				<div class="col-sm-12">
					<div class="panel panel-default card-view">
						<div class="panel-heading" style="padding: 15px 15px; padding-bottom: 0px;">
								<center><span id="msg"></span></center>
							<div class="pull-left">
								<h6 class="panel-title txt-dark" style="padding-top: 7px;">Manage Stock Assignment</h6>
							</div>
							<div class="pull-right">
								<form action="includes/processStockAssign.php?dt1=<?php echo date('Y-m-d',strtotime($FromDate)); ?>&dt2=<?php echo date('Y-m-d',strtotime($ToDate)); ?>&cltid=<?php echo (isset($_GET['cltid']) ? $_GET['cltid'] : '0'); ?>" method="POST" name="sub" id="sub"></form>
								<?php if($_SESSION['userType'] == 4 || $_SESSION['UID'] == "23") { ?>
									<button type="submit" name="assign" form="sub" class="btn btn-warning" style="padding-left: 25px;" title="Assign Stock"><i class="fa fa-truck" style="color: #fff;" aria-hidden="true"></i></button>
								<?php } ?>
								<!-- <?php //if($_SESSION['UID'] == 19) { ?> -->
									<!-- <button type="button" class="btn btn-danger" style="padding-left: 25px;" title="Assign Stock">
									    <a href="https://lakee1508operation.com/modules/cron/autoPO.php" target="_blank" style="color: #fff; text-decoration: none;">
									        <i class="fa fa-tasks" aria-hidden="true"></i>
									    </a>
									</button> -->
								<!-- <?php //} ?> -->
								<?php if($_SESSION['UID'] == 19 || $_SESSION['UID'] == 1) { ?>
									<button type="button" class="btn btn-danger" style="padding-left: 25px;" title="Auto PO" onclick="openInNewTab()">
									    <i class="fa fa-tasks" aria-hidden="true"></i>
									</button>
								<?php } ?>

							</div>
								&nbsp;
								<div class="pull-right">
							<button type="submit" name="download" form="sub" class="btn btn-primary" style="padding-left: 25px;" title="Download"><i class="fa fa-download" style="color: #fff;" aria-hidden="true"></i></button>
								</div>
							<div class="clearfix"></div>
						</div>
						<div class="panel-wrapper collapse in">
							<div class="panel-body" style="padding-top: 0px;padding-bottom: 7px;">
								<div class="row">
									<form action="ManagestockAssignment.php" id="sear" name="sear"></form>
									<div class="col-md-3">
										<div class="form-group">
											<label class="control-label mb-10">Client Name</label>
											<!-- <select class="form-control" form="sear" name="cltid">
												<option value="0">All</option>
												<?php //if($res2) { while ( $row2 = $res2->fetch_assoc() ) { ?>
													<option 
														value="<?php //echo $row2['vmcCltRefID']; ?>" 
														<?php //echo (isset($_GET['cltid']) ? ($_GET['cltid'] == $row2['vmcCltRefID'] ? " selected" : "") : "") ?>>
														<?php 
															//$sql3 = "SELECT `vmcCltName` FROM `vsmanageclient` WHERE `vmcCltRefID`=".$row2['vmcCltRefID'];
															//$res3 = $mysqli->query($sql3);
															//$row3 = $res3->fetch_assoc();
															//echo $row3['vmcCltName'];
														 ?>
													</option>
												<?php //} } ?>
											</select> -->
											<select class="form-control" form="sear" name="cltid[]" id="cltid" multiple="multiple">
											    <?php if($res2) { while ( $row2 = $res2->fetch_assoc() ) { ?>
											        <option 
											            value="<?php echo $row2['vmcCltRefID']; ?>" 
											            <?php echo (isset($_GET['cltid']) && in_array($row2['vmcCltRefID'], (array)$_GET['cltid']) ? " selected" : "") ?>>
											            <?php 
											                $sql3 = "SELECT `vmcCltName` FROM `vsmanageclient` WHERE `vmcCltRefID`=".$row2['vmcCltRefID'];
											                $res3 = $mysqli->query($sql3);
											                $row3 = $res3->fetch_assoc();
											                echo $row3['vmcCltName'];
											             ?>
											        </option>
											    <?php } } ?>
											</select>
										</div>
									</div>
									<!--/span-->
									<div class="col-md-3">
										<div class="form-group">
											<label class="control-label mb-10">Order Date From</label>
	                                        <input type="date" form="sear" name="FromDate" class="form-control" value="<?php echo date("Y-m-d",strtotime($FromDate)); ?>">
										</div>
									</div>
									<div class="col-md-3">
										<div class="form-group">
											<label class="control-label mb-10">Order Date To</label>
											<input type="date" form="sear" name="ToDate" class="form-control" value="<?php echo date("Y-m-d",strtotime($ToDate)); ?>">
										</div>
									</div>
									
									<div class="col-md-1">
										<div class="form-group">
										<label class="control-label mb-10"></label><br>
									    <button class="btn btn-info" type="submit" form="sear" style="padding-left: 10px;">Search <i class="fa fa-search" aria-hidden="true"></i></button>
										</div>
									</div>
									<!--/span-->
								</div>
							</div>
						</div>
					</div>	
				</div>
			</div>
			<div class="row" style="padding-top:10px;">
				<div class="col-sm-12">
					<div class="panel panel-default card-view">
						<div class="panel-heading" style="padding: 15px 15px; padding-bottom: 0px;">
							<div class="clearfix"></div>
						</div>
						<div class="panel-wrapper collapse in">
							<div class="panel-body" style="padding-top: 0px;padding-bottom: 7px;">
								<div class="table-wrap">
									<div class="table-responsive">
										<table id="datable_3" class="table table-hover display  pb-30" >
											<thead>
												<tr>
													<th><input type="checkbox" class="myCheck"></th>
													<th>CLIENT NAME</th>
													<th>ORDER DATE</th>
													<th>BATCH NO</th>
													<th>TOTAL ORDER COUNT</th>
													<th>PENDING STOCK ASIGNMENT </th>
												</tr>
											</thead>
											
											<tbody>
												<?php if ($result) { while ($row = $result->fetch_assoc()) { 
													//if($row['vmcCltRefID'] != '14') { continue; }
												$sql5 = "SELECT COALESCE(COUNT(*),'0') AS 'TotOrdCnt' FROM `vsorder` WHERE `vorUploadID`='".$row['vorUploadID']."' AND `vorStatus` IN ('1','2','3','4') AND `vorOrdHldStatus` != '1'";
												$res5 = $mysqli->query($sql5);
											
												$row5 = $res5->fetch_assoc();
												//echo $sql5;
												$sql6 = "SELECT COALESCE(COUNT(*),'0') AS 'PenOrdCnt' FROM `vsorder` WHERE `vorUploadID`='".$row['vorUploadID']."' AND `vorStatus`='1' AND `vorOrdHldStatus` != '1'"; //die($sql6);
												$res6 = $mysqli->query($sql6);
												$row6 = $res6->fetch_assoc();
												if ($row5['TotOrdCnt'] == '0') { continue; } //echo ($sql6);
												?>
												<tr>
													<td><input form="sub" class="toCheck" type="checkbox" name="chk[]" value="<?php echo $row['vorUploadID']; ?>"></td>
													<td><?php 
															$sql4 = "SELECT `vmcCltName` FROM `vsmanageclient` WHERE `vmcCltRefID`=".$row['vmcCltRefID'];
															$res4 = $mysqli->query($sql4);
															$row4 = $res4->fetch_assoc();
															echo $row4['vmcCltName'];
														 ?></td>
													<td><?php echo date('d-m-Y',strtotime($row['vobOrderDate'])); ?></td>
													<td><?php echo $row['vobBatchNo'] ?></td>
													<td><?php echo $row5['TotOrdCnt']; ?></td>
													<td><?php echo $row6['PenOrdCnt']; ?></td>
												</tr>
												<?php } } ?>
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
					</div>	
				</div>
			</div>
		</div>	
	</div>
    <!-- /#wrapper -->
	
	<!-- JavaScript -->
	
    <!-- jQuery -->
    <script src="../vendors/bower_components/jquery/dist/jquery.min.js"></script>

    <!-- Bootstrap Core JavaScript -->
    <script src="../vendors/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    
	<!-- Data table JavaScript -->
	<script src="../vendors/bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
	<script src="dist/js/dataTables-data.js"></script>
	
	<!-- Slimscroll JavaScript -->
	<script src="dist/js/jquery.slimscroll.js"></script>
	
	<!-- Owl JavaScript -->
	<script src="../vendors/bower_components/owl.carousel/dist/owl.carousel.min.js"></script>
	
	<!-- Switchery JavaScript -->
	<script src="../vendors/bower_components/switchery/dist/switchery.min.js"></script>
	
	<!-- Fancy Dropdown JS -->
	<script src="dist/js/dropdown-bootstrap-extended.js"></script>
	
	<!-- Init JavaScript -->
	<script src="dist/js/init.js"></script>
	<script src="dist/js/timeout.js"> </script>
	<script src="dist/js/usertype.js"> </script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>
	<script>
		function openInNewTab() {
		    var win = window.open("https://erp.lakee1508operation.com/modules/cron/autoPO.php", "_blank");
		    win.focus();
		    setTimeout(function(){ win.close(); }, 1000);
		}
	</script>
	<script>
	    $(document).ready(function() {
			var err = "<?= $err; ?>";
			var succ = "<?= $Succ; ?>";
			if(err!=""){ displaymessage(err);}
			if(succ!=""){ displaymessage(succ);}
	        
	        
	        $('#datable_3').DataTable({
	            //destroy: true,
	            "retrieve": true,
	            "order": [[ 3, "desc" ]],
	            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
	            "ordering": false
	        });
	    
	        $('.myCheck').on('click',function(){
	            var checked_status = this.checked;
	            $('.toCheck').each(function(){ this.checked = checked_status; });
	            $('.myCheck').each(function(){ this.checked = checked_status; });
	    	});

	        $('.toCheck').on('click',function(){
	            var checked_status1 = false;
	            var checked_status2 = true;
	            $('.toCheck').each(function(){ if(this.checked == true) { checked_status1 = true; } else { checked_status2 = false; } });
	            var checked_status = checked_status1 & checked_status2;
	            $('.myCheck').each(function(){ this.checked = checked_status; });
	    	});

	    	$('#cltid').select2({
	            placeholder: "Select Client",
	            allowClear: true,
	            width: 'resolve'
	        });

		});
    </script>
</body>

</html>
